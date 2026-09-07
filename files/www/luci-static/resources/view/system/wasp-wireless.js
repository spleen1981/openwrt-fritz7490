'use strict';
'require view';
'require fs';
'require ui';

var command = '/usr/sbin/wasp-wireless';

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

return view.extend({
	load: function() {
		return run('status').catch(function(err) {
			return _('Unable to read status: %s').format(err.message || err);
		});
	},

	render: function(status) {
		var statusBox = E('pre', {
			'class': 'alert-message',
			'style': 'white-space: pre-wrap; min-height: 8em;'
		}, [ status ]);

		function refresh() {
			ui.showModal(_('WASP Wireless'), [ E('p', { 'class': 'spinning' }, _('Refreshing status...')) ]);
			return run('status').then(function(output) {
				statusBox.textContent = output;
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

		return E([], [
			E('h2', {}, [ _('WASP Wireless Configuration') ]),
			E('p', {}, [
				_('The WASP runs from initramfs. Save the current wireless settings on the Lantiq router to restore them automatically after reboot.')
			]),
			E('p', {}, [
				_('Saved configurations contain wireless passwords in plain text and are readable only by root.')
			]),
			E('h3', {}, [ _('Status') ]),
			statusBox,
			E('div', { 'class': 'cbi-page-actions' }, [
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
					'click': refresh
				}, [ _('Refresh status') ])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
