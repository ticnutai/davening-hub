import { useEffect, useState } from 'react';
import { useTvConfig } from '@/community/components/admin/tv/tvAdminData';
import { useTvSlides } from '@/community/components/admin/tv/tvPreviewData';
import { configForDevice, DEFAULT_TV_CONFIG } from '@/tv/config';
import { TvBoard } from '@/tv/TvBoard';

/** Displays the saved local board through the existing TV renderer and data hooks. */
export function SavedBoard() {
  const saved = useTvConfig();
  const config = configForDevice(saved.data?.config ?? DEFAULT_TV_CONFIG, 'tv');
  const board = useTvSlides(config);
  const [index, setIndex] = useState(0);
  const current = board.slides.length ? index % board.slides.length : 0;
  const seconds = board.slides[current]?.seconds ?? 20;
  useEffect(() => {
    if (board.slides.length < 2) return;
    const timer = window.setTimeout(() => setIndex(i => i + 1), Math.max(5, seconds) * 1000);
    return () => window.clearTimeout(timer);
  }, [index, board.slides.length, seconds]);
  if (saved.isError) return <p role="alert">טעינת הלוח המקומי נכשלה.</p>;
  return <div style={{ width: '100vw', height: '100vh' }}><TvBoard {...board} config={config} index={current} cycle={index} progress={0} paused={false} /></div>;
}
