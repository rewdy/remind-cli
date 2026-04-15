export const HOOK_MARKER = "# remind-cli hook";

export const ZSH_SNIPPET = `
${HOOK_MARKER}
if [[ $SHLVL -eq 1 && $- == *i* ]]; then
  remind check
fi
`;

export const BASH_SNIPPET = `
${HOOK_MARKER}
if [[ $SHLVL -eq 1 && $- == *i* ]]; then
  remind check
fi
`;

export const FISH_SNIPPET = `
${HOOK_MARKER}
if status is-interactive && status is-login
  remind check
end
`;
