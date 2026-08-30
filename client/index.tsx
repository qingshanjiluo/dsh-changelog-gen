import React from 'react';
import { createSettingsCard } from '@deepseek-ai/dsh-settings';

export default createSettingsCard({
  title: 'changelog-gen',
  description: 'CHANGELOG 生成器',
  config: [
    { key: 'enabled', type: 'boolean', label: '启用插件', default: true },
    { key: 'commitsCount', type: 'number', label: '解析提交数量', default: 50 },
    { key: 'includeAuthors', type: 'boolean', label: '包含作者信息', default: true },
    { key: 'includeLinks', type: 'boolean', label: '包含 commit 链接', default: true },
    { key: 'unreleased', type: 'boolean', label: '包含未发布的变更', default: true },
  ],
});
