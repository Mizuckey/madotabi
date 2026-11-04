/** 都道府県コードは先頭ゼロを保持した JIS X 0401 の文字列（例: "01"）。 */
export type LiveCamera = {
  id: string;
  title: string;
  /** 配信確認後に登録する。未登録のカメラは null。 */
  youtubeVideoId: string | null;
  prefectureCode: string;
  prefectureName: string;
  locationName: string;
  latitude: number;
  longitude: number;
  category: string;
};
