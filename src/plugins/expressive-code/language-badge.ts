/**
 * Based on the discussion at https://github.com/expressive-code/expressive-code/issues/153#issuecomment-2282218684
 *
 * Desktop (hover): badge visible, hides on hover to reveal copy/collapse buttons.
 * Mobile  (touch): badge visible, hides on touch to reveal copy/collapse buttons.
 */
import { definePlugin } from "@expressive-code/core";

export function pluginLanguageBadge() {
	return definePlugin({
		name: "Language Badge",
		hooks: {
			postprocessRenderedBlock: ({ codeBlock, renderData }) => {
				const language = codeBlock.language;
				if (language && renderData.blockAst.properties) {
					renderData.blockAst.properties["data-language"] = language;
				}
			},
		},
		baseStyles: () => `
      .frame[data-language]:not(.has-title):not(.is-terminal) {
        position: relative;

        &::after {
          position: absolute;
          z-index: 2;
          right: 0.5rem;
          top: 0.5rem;
          padding: 0.1rem 0.5rem;
          content: attr(data-language);
          font-family: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.75rem;
          font-weight: bold;
          text-transform: uppercase;
          color: var(--btn-content);
          background: var(--btn-regular-bg);
          border-radius: 0.5rem;
          pointer-events: none;
          opacity: 0;
        }

        /* Desktop: show badge, swap to buttons on hover */
        @media (hover: hover) {
          &::after {
            opacity: 1;
          }
          &:hover::after {
            opacity: 0;
          }
        }

        /* Mobile: show badge, tap frame to reveal buttons */
        @media (hover: none) {
          &::after {
            opacity: 1;
          }
          &.show-buttons::after {
            opacity: 0;
          }
        }
      }
    `,
	});
}
