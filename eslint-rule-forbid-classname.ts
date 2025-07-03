import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

type MessageIds = "forbiddenClass";

const createRule = ESLintUtils.RuleCreator(
  () => "https://example.com/forbid-classname"
);

/**
 * 금지된 클래스 이름을 교체합니다.
 * @param token - 클래스 이름 토큰
 * @returns 교체된 클래스 이름 토큰
 */
function replaceForbiddenClassInToken(token: string): string {
  const parts = token.split(":");
  const base = parts[parts.length - 1];
  const replacement = classNameReplacements.get(base);
  if (!replacement) return token;

  parts[parts.length - 1] = replacement;
  return parts.join(":");
}

/**
 * 주어진 클래스 이름에서 기본 클래스 이름을 추출합니다. (예: "sm:text-red-500" -> "text-red-500")
 */
function getBaseClassName(className: string): string {
  const parts = className.split(":");
  return parts[parts.length - 1];
}

/** 금지 클래스 목록 (fix 불가능 포함)  */
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

/** fix 가능한 클래스는 Map으로 관리  */
const classNameReplacements = new Map<string, string>([
  ["forbidden-class", "recommended-class"],
  ["text-red-500", "text-error"],
]);

/**
 * 주어진 클래스 이름에 대한 금지 정보와 교체 정보를 반환합니다.
 * @param cls - 확인할 클래스 이름
 * @returns 금지 이유와 교체 클래스 이름 (있는 경우)
 */
function getForbiddenClassInfo(cls: string): {
  reason?: string;
  replacement?: string;
} {
  let reason: string | undefined;
  for (const group of forbiddenClasses) {
    if (group.classNames.includes(cls)) {
      reason = group.reason;
      break;
    }
  }
  const replacement = classNameReplacements.get(cls);
  return { reason, replacement };
}

/**
 * 리터럴 노드에서 클래스 이름을 추출합니다.
 * @param node - 리터럴 AST 노드
 * @returns 추출된 클래스 이름 목록
 */
function extractFromLiteral(node: TSESTree.Literal): string[] {
  if (typeof node.value === "string") {
    return node.value.split(/\s+/).filter(Boolean);
  }
  return [];
}

/**
 * 배열 표현식 노드에서 클래스 이름을 추출합니다.
 * @param node - 배열 표현식 AST 노드
 * @returns 추출된 클래스 이름 목록
 */
function extractFromArrayExpression(node: TSESTree.ArrayExpression): string[] {
  const names: string[] = [];
  for (const elem of node.elements) {
    if (elem && elem.type === "Literal" && typeof elem.value === "string") {
      names.push(...elem.value.split(/\s+/).filter(Boolean));
    }
  }
  return names;
}

/**
 * 객체 표현식 노드에서 클래스 이름을 추출합니다.
 * @param node - 객체 표현식 AST 노드
 * @returns 추출된 클래스 이름 목록
 */
function extractFromObjectExpression(
  node: TSESTree.ObjectExpression
): string[] {
  const names: string[] = [];
  for (const prop of node.properties) {
    if (prop.type === "Property") {
      if (
        !prop.computed &&
        prop.key.type === "Literal" &&
        typeof prop.key.value === "string"
      ) {
        names.push(...prop.key.value.split(/\s+/).filter(Boolean));
      } else if (prop.key.type === "Identifier") {
        names.push(prop.key.name);
      }
    }
  }
  return names;
}

/**
 * AST 노드에서 클래스 이름을 추출합니다.
 * @param arg - 클래스 이름을 포함할 수 있는 AST 표현식 노드
 * @returns 추출된 클래스 이름 목록
 */
function extractClassNamesFromArg(arg: TSESTree.Expression): string[] {
  const classNames: string[] = [];

  if (arg.type === "Literal") {
    classNames.push(...extractFromLiteral(arg));
  } else if (arg.type === "ArrayExpression") {
    classNames.push(...extractFromArrayExpression(arg));
  } else if (arg.type === "ObjectExpression") {
    classNames.push(...extractFromObjectExpression(arg));
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

    /**
     * 금지된 클래스에 대해 ESLint 보고서를 생성합니다.
     * @param className - 금지된 클래스 이름
     * @param node - 보고할 AST 노드
     * @param fixerTarget - 자동 수정을 적용할 리터럴 노드 (선택 사항)
     */
    function report(
      className: string,
      node: TSESTree.Node,
      fixerTarget: TSESTree.Literal | null
    ) {
      const base = getBaseClassName(className);
      const { reason, replacement } = getForbiddenClassInfo(base);

      if (!reason) return;

      context.report({
        node,
        messageId: "forbiddenClass",
        data: { className, reason },
        fix:
          replacement && fixerTarget
            ? (fixer) => {
                const original = fixerTarget.value as string;
                const fixed = original
                  .split(/\s+/)
                  .map((token) => {
                    const tokenBase = getBaseClassName(token);
                    return tokenBase === base
                      ? replaceForbiddenClassInToken(token)
                      : token;
                  })
                  .join(" ");
                return fixer.replaceText(fixerTarget, `"${fixed}"`);
              }
            : undefined,
      });
    }

    /**
     * 주어진 클래스 목록을 순회하며 금지된 클래스를 보고합니다.
     * @param classList - 검사할 클래스 이름 목록
     * @param node - 보고할 AST 노드
     * @param fixerTarget - 자동 수정을 적용할 리터럴 노드 (선택 사항)
     */
    function checkAndReportClassNames(
      classList: string[],
      node: TSESTree.Node,
      fixerTarget: TSESTree.Literal | null
    ) {
      for (const className of classList) {
        const base = getBaseClassName(className);
        const { reason, replacement } = getForbiddenClassInfo(base);
        if (reason || replacement) {
          report(className, node, fixerTarget);
        }
      }
    }
    return {
      /**
       * JSXAttribute 노드를 방문하여 className 속성을 검사합니다.
       * @param node - JSXAttribute AST 노드
       */
      JSXAttribute(node) {
        if (
          node.name.name === "className" &&
          node.value?.type === "Literal" &&
          typeof node.value.value === "string"
        ) {
          const classList = node.value.value.split(/\s+/).filter(Boolean);
          checkAndReportClassNames(classList, node, node.value);
        }
      },

      /**
       * 리터럴 노드를 방문하여 'className' 주석이 있는 문자열을 검사합니다.
       * @param node - 리터럴 AST 노드
       */
      Literal(node: TSESTree.Literal) {
        if (
          typeof node.value === "string" &&
          node.parent?.type !== "JSXAttribute" // JSXAttribute의 값은 이미 위에서 처리됨
        ) {
          const comments = sourceCode.getCommentsBefore(node);
          const hasClassComment = comments.some(
            (c) => c.value.trim() === "className"
          );

          if (hasClassComment) {
            const classList = node.value.split(/\s+/).filter(Boolean);
            checkAndReportClassNames(classList, node, node);
          }
        }
      },

      /**
       * CallExpression 노드를 방문하여 특정 함수 호출의 인자를 검사합니다.
       * @param node - CallExpression AST 노드
       */
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          ["cn", "twMerge"].includes(node.callee.name)
        ) {
          for (const arg of node.arguments) {
            if (arg.type === "Literal" && typeof arg.value === "string") {
              const classList = arg.value.split(/\s+/).filter(Boolean);
              checkAndReportClassNames(classList, arg, arg);
            } else {
              // Literal이 아닌 다른 타입의 인자 (예: ArrayExpression, ObjectExpression)
              const classList = extractClassNamesFromArg(
                arg as TSESTree.Expression
              );
              checkAndReportClassNames(classList, arg, null); // fix 불가
            }
          }
        }
      },
    };
  },
});
