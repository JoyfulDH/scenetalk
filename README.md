# Scene Talk

영어 말하기 연습 앱입니다. 무작위 일상 장면 역할극이나 자유 대화로 AI와 번갈아 영어로 말하고, 대화가 끝나면 내 문장의 원어민 버전과 상대 대사 해석이 담긴 기록을 받습니다. 기록 속 문장을 한 문장씩 클릭해 복습 노트에 저장할 수 있습니다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `public/index.html` | 앱 화면 전체 (HTML, CSS, JS 한 파일) |
| `server.js` | 화면을 띄우고, Gemini API 호출을 대신 처리하는 Node 서버. API 키는 서버에만 있음 |
| `metadata.json` | AI Studio 앱 이름, 설명, 마이크 권한 요청 |
| `package.json` | 실행 명령과 패키지 (`express`, `@google/genai`) |
| `.env.example` | 환경 변수 예시 |

서버 API

- `POST /api/chat` `{messages:[{role:"user"|"assistant",content}], tier:"quick"|"default"}` → `{text}`: 대화 턴
- `POST /api/json` `{prompt, tier}` → `{value}`: 복습 정리, 말하기 힌트 (JSON 응답)

## AI Studio로 옮기기

1. 이 폴더를 GitHub 저장소로 올립니다 (비공개 저장소도 됩니다).
2. [AI Studio](https://aistudio.google.com) → **Build** → 입력창의 **+** 메뉴 → **Import from GitHub** 로 저장소를 가져옵니다.
3. API 키는 AI Studio가 `GEMINI_API_KEY` 비밀값으로 자동 연결합니다. Secrets 패널에서 확인할 수 있습니다.
4. 실행해서 첫 화면이 뜨면, AI Studio 채팅에 원하는 마무리 작업을 요청하면 됩니다. 아래 "AI Studio에 줄 첫 요청" 참고.

## AI Studio에 줄 첫 요청 (예시)

> 이 앱은 영어 말하기 연습 앱이야. 구조는 그대로 두고 다음을 확인해 줘.
> 1. server.js의 Gemini 모델 이름(`gemini-3.6-flash`, `gemini-3.5-flash-lite`)이 지금 쓸 수 있는 모델인지 확인하고, 아니면 최신 Flash 모델로 바꿔 줘.
> 2. 마이크 버튼(브라우저 음성 인식, en-US)이 미리보기에서 작동하는지 확인해 줘.
> 3. 앱 기능과 화면 디자인은 바꾸지 마.

## 직접 실행 (선택)

```bash
npm install
GEMINI_API_KEY=발급받은키 npm start
# http://localhost:3000
```

## 알아 둘 점

- **모델 이름**: 기본값은 대화 턴과 힌트에 `gemini-3.5-flash-lite`, 복습 정리에 `gemini-3.6-flash`입니다. 모델이 없으면(404) 자동으로 `gemini-2.5-flash`로 다시 시도합니다. 환경 변수 `GEMINI_MODEL`, `GEMINI_MODEL_QUICK`, `GEMINI_MODEL_FALLBACK`으로 바꿀 수 있습니다.
- **마이크**: `metadata.json`에서 마이크 권한을 요청하므로, AI Studio에서는 앱 안의 🎤 버튼으로 바로 말할 수 있습니다 (Chrome, Edge, Safari의 음성 인식 사용). 처음 한 번 권한 허용이 필요합니다.
- **기록 저장 위치**: 대화 기록과 복습 노트는 브라우저의 localStorage에 저장됩니다. 같은 브라우저에서만 보이고, 다른 기기와 공유되지 않습니다. 기기 간 동기화가 필요하면 AI Studio에 데이터베이스 연결을 요청하세요.
- **이전 기록**: Claude에서 만든 기록은 그 페이지의 브라우저 저장소에 있어서 이 앱으로 옮겨지지 않습니다.
- **스트리밍**: 이 버전은 AI 답을 한 번에 받아서 보여 줍니다. 대화 턴은 짧아서 체감 차이는 작습니다.
