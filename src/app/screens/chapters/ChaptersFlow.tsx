/**
 * The chapter picker flow: the class picker (first time, or «بدّل»), the
 * chapter list, one chapter. Behind a home domain card (that domain's filter
 * on). Done parts are read on mount: it is mounted again after each lesson.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CURRICULUM, type Domain } from '../../../content/curriculum';
import { doneParts, type DoneRecord } from '../../../state/doneParts';
import { appStore } from '../../../storage/appStore';
import type { KeyValueStore } from '../../../storage/kv';
import type { EventStore } from '../../../telemetry/eventStore';
import type { Opened } from '../../exercises';
import { ChapterListScreen } from './ChapterListScreen';
import { ChapterScreen } from './ChapterScreen';
import { ClassPicker } from './ClassPicker';
import {
  type StudentClass,
  chapterList,
  chapterRow,
  startFilter,
} from './chapters';
import { loadStudentClass, saveStudentClass } from './studentClass';

export interface ChaptersFlowProps {
  onOpen: (opened: Opened) => void;
  onBack: () => void;
  /** The home card's domain: its filter starts on. */
  domain?: Domain;
  eventStore?: Pick<EventStore, 'load'>;
  doneRecord?: Pick<DoneRecord, 'all'>;
  /** Where the class is kept (the app's store by default; tests inject memory). */
  store?: KeyValueStore;
  /**
   * The open chapter, kept by the parent so a lesson started from a chapter
   * comes back to it (this flow is mounted again after each lesson).
   */
  chapterId?: string | null;
  onChapter?: (chapterId: string | null) => void;
}

export function ChaptersFlow(p: ChaptersFlowProps) {
  const { t } = useTranslation();
  const [store] = useState(() => p.store ?? appStore());
  const [cls, setCls] = useState<StudentClass | null>(() => loadStudentClass(store));
  const [picking, setPicking] = useState(false);
  const [done] = useState(() => doneParts(p.eventStore?.load() ?? [], p.doneRecord));
  const [ownChapter, setOwnChapter] = useState<string | null>(null);
  const chapterId = p.chapterId !== undefined ? p.chapterId : ownChapter;
  const setChapterId = (id: string | null) => {
    setOwnChapter(id);
    p.onChapter?.(id);
  };
  const [filter, setFilter] = useState<Domain | 'all' | null>(null);

  const list = cls ? chapterList(cls, done) : null;
  if (!cls || !list || picking) {
    return (
      <ClassPicker
        initial={cls}
        onPick={next => {
          saveStudentClass(store, next);
          setCls(next);
          setPicking(false);
          setChapterId(null);
          setFilter(null);
        }}
        onBack={cls && list && picking ? () => setPicking(false) : p.onBack}
      />
    );
  }
  const yearShort = t(`chapters.yearShort.${cls.year}`);
  const section = CURRICULUM.sections.find(s => s.id === cls.section)?.fr;
  const classLabel = section ? `${yearShort} · ${section}` : yearShort;
  const row = chapterId ? chapterRow(chapterId, done) : null;
  if (row) {
    return (
      <ChapterScreen
        row={row}
        classLabel={classLabel}
        onBack={() => setChapterId(null)}
        onOpen={p.onOpen}
      />
    );
  }
  return (
    <ChapterListScreen
      list={list}
      classLabel={classLabel}
      filter={filter ?? startFilter(list, p.domain)}
      onFilter={setFilter}
      onChangeClass={() => setPicking(true)}
      onOpenChapter={setChapterId}
      onBack={p.onBack}
    />
  );
}
