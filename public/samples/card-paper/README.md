# 명함 지류 샘플북 사진 슬롯

직접 촬영한 지류 샘플 사진을 이 폴더에 넣고 `src/config/business-card.ts` 의 `photoUrl` 에 파일 이름을 적으면
명함 페이지의 지류 카드와 단가표에 사진이 표시됩니다. 사진이 없으면 화면에는 "샘플 준비 중" 자리가 그대로 남습니다.

- 파일 이름 규칙(권장): `snow250.jpg`, `snow300.jpg`, `banu250.jpg`, `arte310.jpg`, `randevu240.jpg`
- 크기: 가로 320px 정도(정사각형에 가까운 4:3), 200KB 이하
- 예시:

```ts
// src/config/business-card.ts
{ id: 'snow250', name: '스노우지 250g', /* … */ photoUrl: 'samples/card-paper/snow250.jpg' },
```

다른 인쇄소의 사진·문구는 사용하지 않고, 카피박스가 직접 찍은 사진만 넣습니다.
