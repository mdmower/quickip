declare module 'eslint-plugin-no-unsanitized' {
  import type {ESLint, Linter} from 'eslint';

  type PluginRule = NonNullable<ESLint.Plugin['rules']>[string];

  const plugin: {
    meta: {
      name: string;
      version: string;
    };
    rules: {
      property: PluginRule;
      method: PluginRule;
    };
    configs: {
      recommended: Linter.Config<Linter.RulesRecord>;
    };
  };

  export default plugin;
}
