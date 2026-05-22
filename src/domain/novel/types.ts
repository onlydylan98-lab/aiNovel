export interface NovelConfig {
  title: string;
  genre: string;
  coreIdea: string;
  protagonist: string;
  tone: string;
}

export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  synopsis: string;
  status: "pending" | "generating" | "completed";
  content?: string;
  summary?: string;
}

export interface NovelOutline {
  synopsis: string;
  worldview: string;
  characterProfiles: string;
  chapters: ChapterOutline[];
}
