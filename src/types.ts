export type GitConfigEntry = {
  key: string;
  value: string;
  description: string;
};

export type OptionResult = {
  entries: GitConfigEntry[];
  summary: string;
};

export type GitConfigOption = {
  id: string;
  label: string;
  hint: string;
  configure: () => Promise<OptionResult | undefined>;
};
