# ESLint Custom Rule: forbid-classname

이 리포지토리는 "ESLint 커스텀 규칙으로 CSS 클래스명 관리하기" 블로그 게시물과 함께 사용하기 위해 작성되었습니다. 이 프로젝트는 `forbid-classname`이라는 ESLint 커스텀 규칙을 구현하고, 이를 React + TypeScript + Vite 프로젝트에 적용하는 방법을 보여줍니다.

## 🚀 시작하기

이 프로젝트를 로컬에서 실행하려면 다음 단계를 따르세요:

1.  **리포지토리 클론:**

    ```bash
    git clone https://github.com/your-username/forbid-classname.git
    cd forbid-classname
    ```

2.  **의존성 설치:**

    ```bash
    pnpm install
    # 또는 npm install
    # 또는 yarn install
    ```

3.  **개발 서버 실행 (선택 사항):**
    ```bash
    pnpm dev
    ```
    이 명령은 Vite 개발 서버를 시작하여 `src/App.tsx`에 있는 예제 React 애플리케이션을 볼 수 있습니다.

## 🛠️ `forbid-classname` 규칙 사용하기

`forbid-classname` 규칙은 `eslint-rule-forbid-classname.ts` 파일에 정의되어 있습니다. 이 규칙은 특정 CSS 클래스 이름의 사용을 금지하고, 가능한 경우 자동으로 수정(fix)을 제공합니다.

### 규칙 설정

`eslint.config.ts` 파일에서 이 커스텀 규칙을 활성화할 수 있습니다. 다음은 예시 설정입니다:

```typescript
import forbidClassname from "./eslint-rule-forbid-classname.ts"; // 커스텀 규칙 임포트

export default tseslint.config([
  // 다른 규칙 설정들...
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      echoja: {
        rules: {
          "forbid-classname": forbidClassnameRule,
        },
      },
    },
    rules: {
      "echoja/forbid-classname": "error",
    },
  },
]);
```

### 규칙 동작 예시

`src/App.tsx` 파일에서 규칙이 어떻게 동작하는지 확인할 수 있습니다.

**금지된 클래스 예시:**

```tsx
// src/App.tsx
function App() {
  return (
    // 'do-not-use-this'는 금지된 클래스입니다.
    <div className="do-not-use-this">
      <p className="text-pink-600">이 텍스트는 직접 색상 사용을 금지합니다.</p>
    </div>
  );
}

// 주석을 통해 클래스명으로 인식되는 문자열
/* className */ ("forbidden-class another-class");

// cn, twMerge와 같은 유틸리티 함수 내에서도 작동
import { cn } from "./utils"; // 예시 유틸리티 함수
cn("text-red-500", "some-other-class");
```

위 코드에서 `do-not-use-this`와 `text-pink-600`는 ESLint 규칙에 의해 플래그됩니다. `forbidden-class`와 `text-red-500`는 자동 수정이 가능합니다.

## 블로그 게시물

이 프로젝트와 관련된 자세한 내용은 [ESLint Rule: 특정 className 사용 금지하기 (바이브 코딩을 위해)](https://springfall.cc/article/2025-07/eslint-forbid-classname) 블로그 글에서 확인할 수 있습니다
