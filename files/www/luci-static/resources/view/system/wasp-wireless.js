'use strict';
'require view';
'require fs';
'require ui';

var command = '/usr/sbin/wasp-wireless';
var waspLuciUrl = 'http://192.168.1.2/';
var uplinkCommand = '/usr/sbin/wasp-uplink-fix';

function run(action) {
return fs.exec(command, [ action ]).then(function(res) {
var output = '';

if (res.stdout)
output += res.stdout;
if (res.stderr)
output += (output ? '\n' : '') + res.stderr;

if (res.code !== 0)
throw new Error(output || _('Command failed with exit code %d').format(res.code));

return output || _('Command completed successfully.');
});
}

function runUplink(action) {
return fs.exec(uplinkCommand, [ action ]).then(function(res) {
var output = '';

if (res.stdout)
output += res.stdout;
if (res.stderr)
output += (output ? '\n' : '') + res.stderr;

if (res.code !== 0)
throw new Error(output || _('Command failed with exit code %d').format(res.code));

return output || _('Command completed successfully.');
});
}

function redactStatus(status) {
return status.replace(/("key"\s*:\s*)"(?:[^"\\]|\\.)*"/g, '$1"***"');
}

function summarizeRadiosFallback(jsonPart) {
var lines = [];
var re = /"(radio\d+)"\s*:\s*\{\s*"up"\s*:\s*(true|false)/g;
var m;

while ((m = re.exec(jsonPart)) !== null)
lines.push(m[1] + ': ' + (m[2] === 'true' ? _('up') : _('down')));

return lines;
}

function summarizeStatus(status) {
var jsonStart = status.indexOf('{');
var header = (jsonStart >= 0 ? status.substring(0, jsonStart) : status).trim();
var lines = header ? header.split(/\r?\n/).filter(function(line) { return line.trim() !== ''; }) : [];

if (jsonStart < 0)
return lines.join('\n') || _('Status unavailable');

var jsonPart = status.substring(jsonStart);

try {
var data = JSON.parse(jsonPart);
var radios = Object.keys(data).filter(function(name) {
return data[name] && typeof data[name] === 'object' && Array.isArray(data[name].interfaces);
});

if (!radios.length)
throw new Error('no radios found in status');

radios.sort().forEach(function(name) {
var radio = data[name];
var modes = {};

radio.interfaces.forEach(function(iface) {
var mode = iface && iface.config && iface.config.mode;
if (mode)
modes[mode] = (modes[mode] || 0) + 1;
});

var modeParts = [];
if (modes.ap)
modeParts.push(_('%d AP').format(modes.ap));
if (modes.mesh)
modeParts.push(_('%d mesh').format(modes.mesh));
if (modes.sta)
modeParts.push(_('%d station').format(modes.sta));

lines.push(
name + ': ' + (radio.up === true ? _('up') : _('down')) +
(modeParts.length ? ' (' + modeParts.join(', ') + ')' : '')
);
});
}
catch (e) {
var fallback = summarizeRadiosFallback(jsonPart);

if (fallback.length)
lines = lines.concat(fallback);
else
lines.push(_('Radio status could not be parsed.'));
}

return lines.join('\n');
}

return view.extend({
load: function() {
return Promise.all([
run('status').catch(function(err) {
return _('Unable to read status: %s').format(err.message || err);
}),
runUplink('status').catch(function(err) {
return _('Unable to read status: %s').format(err.message || err);
})
]);
},

render: function(data) {
var status = data[0];
var uplinkStatus = data[1];

var summaryBox = E('pre', {
'class': 'alert-message',
'style': 'white-space: pre-wrap;'
}, [ summarizeStatus(status) ]);
var detailsBox = E('pre', {
'style': 'white-space: pre-wrap; max-height: 32em; overflow: auto;'
}, [ redactStatus(status) ]);

function setStatus(output) {
summaryBox.textContent = summarizeStatus(output);
detailsBox.textContent = redactStatus(output);
}

function refresh() {
ui.showModal(_('WASP Configuration'), [ E('p', { 'class': 'spinning' }, _('Refreshing status...')) ]);
return run('status').then(function(output) {
setStatus(output);
ui.hideModal();
}).catch(function(err) {
ui.hideModal();
ui.addNotification(null, E('p', {}, err.message || String(err)), 'error');
});
}

function execute(action, title, confirmation) {
var start = function() {
ui.showModal(title, [ E('p', { 'class': 'spinning' }, _('Operation in progress...')) ]);
return run(action).then(function(output) {
ui.hideModal();
ui.addNotification(null, E('pre', { 'style': 'white-space: pre-wrap;' }, output), 'info');
return refresh();
}).catch(function(err) {
ui.hideModal();
ui.addNotification(null, E('p', {}, err.message || String(err)), 'error');
});
};

if (!confirmation)
return start();

ui.showModal(title, [
E('p', {}, confirmation),
E('div', { 'class': 'right' }, [
E('button', {
'class': 'btn',
'click': ui.hideModal
}, [ _('Cancel') ]),
' ',
E('button', {
'class': 'btn cbi-button-negative important',
'click': start
}, [ _('Continue') ])
])
]);
}

var uplinkStatusBox = E('pre', {
'style': 'white-space: pre-wrap;'
}, [ uplinkStatus ]);

function refreshUplink() {
ui.showModal(_('WASP Uplink Fix'), [ E('p', { 'class': 'spinning' }, _('Refreshing status...')) ]);
return runUplink('status').then(function(output) {
uplinkStatusBox.textContent = output;
ui.hideModal();
}).catch(function(err) {
ui.hideModal();
ui.addNotification(null, E('p', {}, err.message || String(err)), 'error');
});
}

function executeUplink(action, title, confirmation) {
var start = function() {
ui.showModal(title, [ E('p', { 'class': 'spinning' }, _('Operation in progress...')) ]);
return runUplink(action).then(function(output) {
ui.hideModal();
ui.addNotification(null, E('pre', { 'style': 'white-space: pre-wrap;' }, output), 'info');
return refreshUplink();
}).catch(function(err) {
ui.hideModal();
ui.addNotification(null, E('p', {}, err.message || String(err)), 'error');
});
};

if (!confirmation)
return start();

ui.showModal(title, [
E('p', {}, confirmation),
E('div', { 'class': 'right' }, [
E('button', {
'class': 'btn',
'click': ui.hideModal
}, [ _('Cancel') ]),
' ',
E('button', {
'class': 'btn cbi-button-action important',
'click': start
}, [ _('Continue') ])
])
]);
}

var uplinkActions = E('div', { 'class': 'cbi-page-actions' }, [
E('button', {
'class': 'btn cbi-button-action',
'click': function() {
return executeUplink(
'enable',
_('Enable WASP uplink fix'),
_('This adds a default route via 192.168.1.2 (WASP) and forces DNS resolution through public servers (8.8.8.8, 1.1.1.1), bypassing the unused PPPoE/DSL WAN. Continue?')
);
}
}, [ _('Enable') ]),
' ',
E('button', {
'class': 'btn cbi-button-negative',
'click': function() { return executeUplink('disable', _('Disable WASP uplink fix')); }
}, [ _('Disable') ]),
' ',
E('button', {
'class': 'btn',
'click': refreshUplink
}, [ _('Refresh status') ])
]);

var actions = E('div', { 'class': 'cbi-page-actions' }, [
E('button', {
'class': 'btn cbi-button-action',
'click': function() { return execute('save', _('Save current configuration')); }
}, [ _('Save current') ]),
' ',
E('button', {
'class': 'btn cbi-button-action',
'click': function() { return execute('restore', _('Restore saved configuration')); }
}, [ _('Restore saved') ]),
' ',
E('button', {
'class': 'btn cbi-button-neutral',
'click': function() { return execute('restore-backup', _('Restore previous backup')); }
}, [ _('Restore previous') ]),
' ',
E('button', {
'class': 'btn cbi-button-negative',
'click': function() {
return execute(
'factory',
_('Restore factory configuration'),
_('The current saved configuration will be moved to saved.bak and the current WASP configuration (captured on first boot) will be applied. Continue?')
);
}
}, [ _('Restore factory') ]),
' ',
E('button', {
'class': 'btn',
'click': function() { window.open(waspLuciUrl, '_blank', 'noopener'); }
}, [ _('Open WASP LuCI') ]),
' ',
E('button', {
'class': 'btn',
'click': refresh
}, [ _('Refresh status') ])
]);

return E([], [
E('h2', {}, [ _('WASP Configuration Backup') ]),
E('p', {}, [
_('The WASP runs from initramfs, so its entire configuration (network, firewall, dhcp, system, wireless, ...) is normally lost after reboot. Save the current configuration on the Lantiq router to restore it automatically at every boot: each UCI package is exported from the WASP and re-imported when restored. If no configuration has ever been saved, the current settings are captured automatically as the factory snapshot on first boot.')
]),
actions,
E('h3', {}, [ _('Status') ]),
summaryBox,
E('details', {}, [
E('summary', { 'style': 'cursor: pointer;' }, [ _('Show full status') ]),
detailsBox
]),
E('h2', {}, [ _('WASP Uplink Connectivity Fix') ]),
E('p', {}, [
_('Use this only when internet connectivity is provided through the WASP wireless client uplink instead of the Lantiq PPPoE/DSL WAN. Adds a default route via the WASP and forces DNS resolution through public servers. Disabled by default; safe to leave off for regular WAN setups.')
]),
uplinkActions,
uplinkStatusBox
]);
},

handleSaveApply: null,
handleSave: null,
handleReset: null
});
