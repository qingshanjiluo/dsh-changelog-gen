import React from 'react';

export const inject = ['settingsScope', 'slots', 'locale'] as const;

const zh = {
  title: 'CHANGELOG 生成器',
  enabled: '启用 CHANGELOG 生成',
  commitsCount: '最大提交数',
  includeAuthors: '包含作者信息',
  includeLinks: '包含提交链接',
  unreleased: '显示未发布版本',
};

const en = {
  title: 'Changelog Generator',
  enabled: 'Enable Changelog Generation',
  commitsCount: 'Max Commits',
  includeAuthors: 'Include Authors',
  includeLinks: 'Include Links',
  unreleased: 'Show Unreleased',
};

export function apply(ctx: any) {
  const { settingsScope, slots, locale } = ctx;

  locale.register('dsh-changelog-gen', { zh, en });

  settingsScope.registerCard('dsh-changelog-gen', {
    title: locale.t('dsh-changelog-gen.title'),
    render: () => React.createElement(ChangelogCard),
  });
}

function ChangelogCard() {
  const { settingsScope, locale } = React.useContext(React.createContext<any>({}));
  const t = (key: string) => locale.t(`dsh-changelog-gen.${key}`);

  const [enabled, setEnabled] = React.useState(true);
  const [commitsCount, setCommitsCount] = React.useState(50);
  const [includeAuthors, setIncludeAuthors] = React.useState(true);
  const [includeLinks, setIncludeLinks] = React.useState(true);
  const [unreleased, setUnreleased] = React.useState(true);

  React.useEffect(() => {
    const stored = settingsScope.get('dsh-changelog-gen');
    if (stored) {
      setEnabled(stored.enabled ?? true);
      setCommitsCount(stored.commitsCount ?? 50);
      setIncludeAuthors(stored.includeAuthors ?? true);
      setIncludeLinks(stored.includeLinks ?? true);
      setUnreleased(stored.unreleased ?? true);
    }
  }, []);

  React.useEffect(() => {
    settingsScope.set('dsh-changelog-gen', {
      enabled,
      commitsCount,
      includeAuthors,
      includeLinks,
      unreleased,
    });
  }, [enabled, commitsCount, includeAuthors, includeLinks, unreleased]);

  return React.createElement('div', { className: 'dsh-changelog-card' },
    React.createElement('div', { className: 'dsh-setting-row' },
      React.createElement('label', { className: 'dsh-toggle-label' },
        React.createElement('span', null, t('enabled')),
        React.createElement('input', {
          type: 'checkbox',
          checked: enabled,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEnabled(e.target.checked),
          className: 'dsh-toggle',
        }),
      ),
    ),
    React.createElement('div', { className: 'dsh-setting-row' },
      React.createElement('label', { className: 'dsh-input-label' },
        React.createElement('span', null, t('commitsCount')),
        React.createElement('input', {
          type: 'number',
          min: 1,
          max: 500,
          value: commitsCount,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCommitsCount(parseInt(e.target.value) || 50),
          className: 'dsh-number-input',
        }),
      ),
    ),
    React.createElement('div', { className: 'dsh-setting-row' },
      React.createElement('label', { className: 'dsh-toggle-label' },
        React.createElement('span', null, t('includeAuthors')),
        React.createElement('input', {
          type: 'checkbox',
          checked: includeAuthors,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setIncludeAuthors(e.target.checked),
          className: 'dsh-toggle',
        }),
      ),
    ),
    React.createElement('div', { className: 'dsh-setting-row' },
      React.createElement('label', { className: 'dsh-toggle-label' },
        React.createElement('span', null, t('includeLinks')),
        React.createElement('input', {
          type: 'checkbox',
          checked: includeLinks,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setIncludeLinks(e.target.checked),
          className: 'dsh-toggle',
        }),
      ),
    ),
    React.createElement('div', { className: 'dsh-setting-row' },
      React.createElement('label', { className: 'dsh-toggle-label' },
        React.createElement('span', null, t('unreleased')),
        React.createElement('input', {
          type: 'checkbox',
          checked: unreleased,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setUnreleased(e.target.checked),
          className: 'dsh-toggle',
        }),
      ),
    ),
  );
}
