/**
 * Counts the interactive elements of a rendered tree (hard rule 10: no
 * component renders more than 60). A host node is interactive when it has a
 * press / responder handler, an interactive accessibility role, or is a text
 * field. Disabled ones count: they still take a place on screen. Works on
 * `screen.toJSON()` from React Native Testing Library; not used outside tests.
 */
export const MAX_INTERACTIVE = 60;

export interface JsonNode {
  type: string;
  props: Record<string, unknown>;
  children: (JsonNode | string)[] | null;
}

const ROLES = new Set([
  'button',
  'adjustable',
  'link',
  'switch',
  'checkbox',
  'radio',
  'tab',
  'imagebutton',
  'togglebutton',
]);
const HANDLERS = [
  'onClick',
  'onPress',
  'onResponderGrant',
  'onResponderRelease',
  'onStartShouldSetResponder',
];

function isInteractive(n: JsonNode): boolean {
  if (n.type === 'TextInput') {
    return true;
  }
  const role = n.props.accessibilityRole ?? n.props.role;
  return (
    (typeof role === 'string' && ROLES.has(role)) ||
    HANDLERS.some(h => typeof n.props[h] === 'function')
  );
}

export function countInteractive(
  tree: JsonNode | readonly JsonNode[] | null,
): number {
  if (tree === null) {
    return 0;
  }
  if (Array.isArray(tree)) {
    return (tree as readonly JsonNode[]).reduce(
      (sum, n) => sum + countInteractive(n),
      0,
    );
  }
  const node = tree as JsonNode;
  const inner = (node.children ?? []).reduce(
    (sum, c) => sum + (typeof c === 'string' ? 0 : countInteractive(c)),
    0,
  );
  return (isInteractive(node) ? 1 : 0) + inner;
}
