import React from 'react';

const NS = 'changelog-gen';

const zh = {
  title: 'CHANGELOG 生成器',
  description: '从 Git 提交历史自动生成变更日志',
  enabled: '启用插件',
  commitsCount: '最大提交数',
  includeAuthors: '包含作者信息',
  includeLinks: '包含提交链接',
  unreleased: '显示未发布版本',
};

const en = {
  title: 'Changelog Generator',
  description: 'Auto-generate changelog from Git commit history',
  enabled: 'Enable plugin',
  commitsCount: 'Max Commits',
  includeAuthors: 'Include Authors',
  includeLinks: 'Include Links',
  unreleased: 'Show Unreleased',
};

export const inject = ['settingsScope', 'slots', 'locale'];

export function apply(ctx: any) {
  ctx.effect?.(() => ctx.locale?.register?.(NS, { zh, en }), `dsh-${NS}: locale`);
  ctx.effect?.(() => {
    ctx.slots?.inject?.('settings.plugin.item', function* () {
      yield ctx.slots.register({ name: 'settings.plugin.item', key: NS, locale: NS, inject: () => ({}) }, Card);
    });
  }, `dsh-${NS}: settings`);
}

function Card(props: any) {
  const { scope, t } = props;
  const [open, setOpen] = React.useState(false);
  const s = { background: '#1a1a2e', color: '#e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid #333' } as React.CSSProperties;
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.15s' } as React.CSSProperties;
  const label = { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', marginBottom: '6px' } as React.CSSProperties;

  return React.createElement('li', { className: `dsh-${NS}-card`, style: s },
    React.createElement('div', { style: row, onClick: () => setOpen(!open), onMouseEnter: (e: any) => e.currentTarget.style.background = '#252540', onMouseLeave: (e: any) => e.currentTarget.style.background = 'transparent' },
      React.createElement('div', null,
        React.createElement('strong', { style: { fontSize: '14px' } }, '\uD83D\uDCCB ', t('title')),
        React.createElement('p', { style: { margin: '2px 0 0', fontSize: '12px', color: '#888' } }, t('description')),
      ),
      React.createElement('span', { style: { fontSize: '12px', color: '#888' } }, open ? '\u25B2' : '\u25BC'),
    ),
    open ? React.createElement('div', { style: { padding: '8px 0', borderTop: '1px solid #333' } },
      React.createElement('label', { style: label },
        React.createElement('input', { type: 'checkbox', checked: scope?.get?.('enabled') ?? true, onChange: (e: any) => scope?.set?.('enabled', e.target.checked) }),
        t('enabled'),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
        React.createElement('label', { style: { fontSize: '13px', minWidth: '100px' } }, t('commitsCount')),
        React.createElement('input', { type: 'number', min: 1, max: 500, value: scope?.get?.('commitsCount') ?? 50, onChange: (e: any) => scope?.set?.('commitsCount', Number(e.target.value)), style: { width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #444', background: '#0d0d1a', color: '#e0e0e0', fontSize: '13px' } }),
      ),
      React.createElement('label', { style: label },
        React.createElement('input', { type: 'checkbox', checked: scope?.get?.('includeAuthors') ?? true, onChange: (e: any) => scope?.set?.('includeAuthors', e.target.checked) }),
        t('includeAuthors'),
      ),
      React.createElement('label', { style: label },
        React.createElement('input', { type: 'checkbox', checked: scope?.get?.('includeLinks') ?? true, onChange: (e: any) => scope?.set?.('includeLinks', e.target.checked) }),
        t('includeLinks'),
      ),
      React.createElement('label', { style: { ...label, marginBottom: 0 } },
        React.createElement('input', { type: 'checkbox', checked: scope?.get?.('unreleased') ?? true, onChange: (e: any) => scope?.set?.('unreleased', e.target.checked) }),
        t('unreleased'),
      ),
    ) : null,
  );
}
