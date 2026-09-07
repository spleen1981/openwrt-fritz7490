'use strict';
'require view';
'require fs';
'require ui';

var command = '/usr/sbin/wasp-wireless';
var waspLuciUrl = 'http://192.168.1.2/';

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

function redactStatus(status) {
	return status.replace(/("key"\s*:\s*)"(?:[^"\\]|\\.)*"/g, '$1"***"');
}

function summarizeStatus(status) {
	var jsonStart = status.indexOf('{');
	var header = (jsonStart >= 0 ? status.substring(0, jsonStart) : status).trim();
	var lines = header ? header.split(/\r?\n/).filter(function(line) { return line.trim() !== ''; }) : [];

	if (jsonStart < 0)
		return lines.join('\n') || _('Status unavailable');

	try {
		var data = JSON.parse(status.substring(jsonStart));
		var radios = Object.keys(data).filter(function(name) {
			return data[name] && typeof data[name] === 'object' && Array.isArray(data[name].interfaces);
		});
		var radiosUp = 0;
		var modes = {};

		radios.forEach(function(name) {
			var radio = data[name];
			if (radio.up === true)
				radiosUp++;

			radio.interfaces.forEach(function(iface) {
				var mode = iface && iface.config && iface.config.mode;
				if (mode)
					modes[mode] = (modes[mode] || 0) + 1;
			});
		});

		lines.push(_('Radios: %d/%d up').format(radiosUp, radios.length));
		lines.push(_('Interfaces: %d AP, %d mesh, %d station').format(
			modes.ap || 0,
			modes.mesh || 0,
			modes.sta || 0
		));
	}
	catch (e) {
		lines.push(_('Wireless details could not be summarized.'));
	}

	return lines.join('\n');
}

return view.extend({
	load: function() {
		return run('status').catch(function(err) {
			return _('Unable to read status: %s').format(err.message || err);
		});
	},

	render: function(status) {
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
			ui.showModal(_('WASP Wireless'), [ E('p', { 'class': 'spinning' }, _('Refreshing status...')) ]);
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
						_('The current saved configuration will be moved to saved.bak and the firmware factory wireless configuration will be applied. Continue?')
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
			E('h2', {}, [ _('WASP Wireless Configuration') ]),
			E('p', {}, [
				_('The WASP runs from initramfs. Save the current wireless settings on the Lantiq router to restore them automatically after reboot.')
			]),
			E('p', {}, [
				_('Saved configurations contain wireless passwords in plain text and are readable only by root.')
			]),
			actions,
			E('h3', {}, [ _('Status') ]),
			summaryBox,
			E('details', {}, [
				E('summary', { 'style': 'cursor: pointer;' }, [ _('Show full status') ]),
				detailsBox
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
