import type { LiveCamera } from "@/types/camera";

/** 画面開発用のサンプル地点。実在する配信を示すデータではありません。 */
export const cameras: LiveCamera[] = [
  {
    id: "sample-yokohama",
    title: "みなとみらいの風景",
    youtubeVideoId: null,
    prefectureCode: "14",
    prefectureName: "神奈川県",
    locationName: "横浜市 みなとみらい",
    latitude: 35.457,
    longitude: 139.633,
    category: "街・港",
  },
];
