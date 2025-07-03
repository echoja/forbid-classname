import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

type MessageIds = "forbiddenClass";

const createRule = ESLintUtils.RuleCreator(
  () => "https://example.com/forbid-classname"
);

// ✅ 금지 클래스 목록 (fix 불가능 포함)
const forbiddenClasses: { classNames: string[]; reason: string }[] = [
  {
    classNames: ["do-not-use-this", "legacy-ui", "forbidden-class"],
    reason: "디자인 시스템 가이드 위반",
  },
  {
    classNames: ["text-pink-600"],
    reason: "직접 색상 사용 금지 – 테마 색상 사용 필요",
  },
];

// ✅ fix 가능한 클래스는 Map으로 관리
const classNameReplacements = new Map<string, string>([
  ["forbidden-class", "recommended-class"],
  ["text-red-500", "text-error"],
]);

// 🔍 금지 클래스인지 확인
function getForbiddenReason(cls: string): string | undefined {
  for (const group of forbiddenClasses) {
    if (group.classNames.includes(cls)) {
      return group.reason;
    }
  }
  return undefined;
}

// 🧼 class string 추출
function extractClassNamesFromArg(arg: TSESTree.Expression): string[] {
  const classNames: string[] = [];

  if (arg.type === "Literal" && typeof arg.value === "string") {
    classNames.push(...arg.value.split(/\s+/));
  }

  if (arg.type === "ArrayExpression") {
    for (const elem of arg.elements) {
      if (elem && elem.type === "Literal" && typeof elem.value === "string") {
        classNames.push(...elem.value.split(/\s+/));
      }
    }
  }

  if (arg.type === "ObjectExpression") {
    for (const prop of arg.properties) {
      if (
        prop.type === "Property" &&
        !prop.computed &&
        prop.key.type === "Literal" &&
        typeof prop.key.value === "string"
      ) {
        classNames.push(...(prop.key.value as string).split(/\s+/));
      }
      if (prop.type === "Property" && prop.key.type === "Identifier") {
        classNames.push(prop.key.name);
      }
    }
  }

  return classNames;
}

export default createRule<[], MessageIds>({
  name: "forbid-classname",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow and optionally fix forbidden class names",
    },
    schema: [],
    fixable: "code",
    messages: {
      forbiddenClass: 'Class "{{className}}" is forbidden: {{reason}}',
    },
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context;

    function reportClass(
      cls: string,
      node: TSESTree.Node,
      fixerTarget: TSESTree.Literal | null
    ) {
      const replacement = classNameReplacements.get(cls);
      const reason = getForbiddenReason(cls);

      if (!reason) return;

      context.report({
        node,
        messageId: "forbiddenClass",
        data: { className: cls, reason },
        fix:
          replacement && fixerTarget
            ? (fixer) => {
                const original = fixerTarget.value as string;
                const fixed = original
                  .split(/\s+/)
                  .map((c) => (c === cls ? replacement : c))
                  .join(" ");
                return fixer.replaceText(fixerTarget, `"${fixed}"`);
              }
            : undefined,
      });
    }

    return {
      JSXAttribute(node) {
        if (
          node.name.name === "className" &&
          node.value?.type === "Literal" &&
          typeof node.value.value === "string"
        ) {
          const classList = node.value.value.split(/\s+/);
          for (const cls of classList) {
            if (classNameReplacements.has(cls) || getForbiddenReason(cls)) {
              reportClass(cls, node, node.value);
            }
          }
        }
      },

      Literal(node: TSESTree.Literal) {
        if (
          typeof node.value === "string" &&
          node.parent?.type !== "JSXAttribute"
        ) {
          const comments = sourceCode.getCommentsBefore(node);
          console.log("Comments before node:", comments);
          const hasClassComment = comments.some(
            (c) => c.value.trim() === "className"
          );

          if (hasClassComment) {
            const classList = node.value.split(/\s+/);
            for (const cls of classList) {
              if (classNameReplacements.has(cls) || getForbiddenReason(cls)) {
                reportClass(cls, node, node);
              }
            }
          }
        }
      },

      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          ["cn", "twMerge"].includes(node.callee.name)
        ) {
          for (const arg of node.arguments) {
            if (arg.type === "Literal" && typeof arg.value === "string") {
              const classList = arg.value.split(/\s+/);
              for (const cls of classList) {
                if (classNameReplacements.has(cls) || getForbiddenReason(cls)) {
                  reportClass(cls, arg, arg);
                }
              }
            } else {
              const classList = extractClassNamesFromArg(
                arg as TSESTree.Expression
              );
              for (const cls of classList) {
                if (classNameReplacements.has(cls) || getForbiddenReason(cls)) {
                  reportClass(cls, arg, null); // fix 불가
                }
              }
            }
          }
        }
      },
    };
  },
});
