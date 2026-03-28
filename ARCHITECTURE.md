# ERICA Board Admin - Architecture & Integration Guide

## 1. 아키텍처 개요

이 프로젝트는 `Presentation Layer` (React UI)와 `Data Layer` (Repository)를 명확히 분리하여, 추후 실제 백엔드 API가 개발되었을 때 UI 수정 없이 `Repository` 구현체만 교체하면 되도록 설계되었습니다.

### 데이터 흐름
`User Web` (Future) / `Admin Web` (Current) 
      ⬇
`Repository Interface` (ContestRepo, MetricsRepo)
      ⬇
`Adapter` (Currently `LocalStorage Adapter` + Mock Data)
      ⬇
`Storage` (Browser LocalStorage / Future: REST API)

## 2. 통합 체크리스트 (사용자 웹과 합칠 때)

기존 사용자 웹 프로젝트(`HYU-ERICA-Board`)에 이 코드를 통합할 때 다음 단계를 따르세요.

1. **파일 이동**:
   - `pages/`, `components/` 폴더 내의 관리자 전용 컴포넌트를 `src/admin/` 하위로 이동합니다.
   - `types.ts`, `constants.ts`는 프로젝트 루트의 `shared/` 또는 `types/`로 이동하여 사용자 웹과 타입을 공유합니다.

2. **라우팅 연결**:
   - 기존 사용자 웹의 `Router` 설정에 `/admin` 경로를 추가하고 `AdminLayout`을 마운트합니다.
   - `Landing.tsx`는 `/admin` 루트 접근 시 또는 별도의 홍보 페이지로 활용합니다.

3. **데이터 소스 교체**:
   - `services/repository.ts`의 내용을 실제 API 호출(`fetch` or `axios`)로 변경합니다.
   - 예: `ContestRepository.getAll()` 내부에서 `localStorage.getItem` 대신 `axios.get('/api/contests')` 호출.

4. **자산(Assets) 교체**:
   - `constants.ts` 내의 `LOGO_PLACEHOLDER` 상수를 실제 한양대/모두의연구소 로고 파일 경로로 변경합니다.

5. **인증(Auth) 강화**:
   - `context/AuthContext.tsx`의 `login` 함수를 실제 Google OAuth 또는 서버 인증 로직으로 교체합니다.

## 3. Assumptions (가정) 및 TODO

- **가정**: 
  - 공모전 참여율 계산을 위한 전체 학생 수는 9000명으로 상수(`TOTAL_STUDENTS_ESTIMATE`) 처리했습니다.
  - 현재는 서버가 없으므로 브라우저 `localStorage`를 DB처럼 사용합니다.
  - MVP 단계에서는 비밀번호 검증 없이 로그인 버튼만 누르면 통과됩니다.

- **TODO**:
  - [ ] Google OAuth 로그인 구현
  - [ ] 실제 백엔드 API 연동 (Repository 패턴 활용)
  - [ ] 이미지 업로드 기능 (현재는 URL 입력 방식)
  - [ ] 사용자 웹 프로젝트의 폰트/컬러 토큰(Tailwind config) 동기화
  - [ ] Slack/Email Webhook을 통한 긴급 티켓 알림 연동