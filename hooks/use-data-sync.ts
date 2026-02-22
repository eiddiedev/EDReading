
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { VocabularyWord } from "@/types";
import { Session } from "@supabase/supabase-js";

/**
 * 自定义 Hook：处理数据同步逻辑
 * 负责将本地 IndexedDB 数据与 Supabase 云端数据进行合并同步。
 * 目前主要处理生词本 (Vocabulary) 数据。
 */
export function useDataSync() {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('idle');
  
  // 从全局 Store 获取本地词汇数据和更新方法
  const localVocabulary = useAppStore((state) => state.vocabulary);
  const setVocabulary = useAppStore((state) => state.setVocabulary);

  /**
   * 执行同步操作
   * @param session 可选的 Supabase 会话对象。如果未提供，将尝试自动获取。
   */
  const sync = useCallback(async (session?: Session) => {
    // 防止重复触发同步
    if (syncStatus === 'syncing') return;
    
    let currentSession = session;
    
    // 如果没有传入 session，尝试获取当前会话
    if (!currentSession) {
        const { data: { session: fetchedSession }, error } = await supabase.auth.getSession();
        if (error || !fetchedSession) {
            console.warn("Sync skipped: No session available");
            return;
        }
        currentSession = fetchedSession;
    }

    setSyncStatus('syncing');
    
    try {
      // 1. 检查云端数据状态
      // 使用 count: 'exact', head: true 只获取数量，减少数据传输
      const { count: vocabCount, error: vocabError } = await supabase
        .from('vocabulary')
        .select('*', { count: 'exact', head: true });
        
      if (vocabError) throw vocabError;

      // 2. 同步逻辑：如果云端为空 且 本地有数据 -> 上传本地数据 (初次同步/迁移)
      if ((vocabCount === 0 || vocabCount === null) && localVocabulary.length > 0) {
        toast.info("检测到本地数据，正在同步到云端...");
        
        // 批量构建插入数据 payload
        const vocabPayload = localVocabulary.map(v => ({
            id: v.id,
            user_id: currentSession!.user.id,
            word: v.word,
            phonetic: v.phonetic,
            definition: v.definition,
            translation: v.exampleTranslation,
            example: v.example,
            review_count: v.reviewCount || 0,
            correct_count: v.correctCount || 0,
            tags: v.tags || [], 
            created_at: v.createdAt || new Date().toISOString()
        }));

        // 执行 Upsert 操作
        const { error: uploadError } = await supabase.from('vocabulary').upsert(vocabPayload);
        if (uploadError) throw uploadError;
        
        toast.success("本地数据已成功上传！");
      } else {
        // 3. 如果云端有数据 (或两边都空) -> 下载云端数据 (覆盖本地)
        // 注意：目前的逻辑是云端为准，即“水合”(Hydrate)
        if (vocabCount && vocabCount > 0) {
            const { data: cloudVocab, error: fetchError } = await supabase
                .from('vocabulary')
                .select('id, user_id, word, phonetic, definition, translation, example, review_count, correct_count, tags, created_at, next_review_at, last_reviewed_at, review_stage, mastery_level');
            if (fetchError) throw fetchError;
            
            if (cloudVocab) {
                // 映射数据库字段到本地应用状态结构
                const mappedVocab: VocabularyWord[] = cloudVocab.map((v: any) => ({
                    id: v.id,
                    word: v.word,
                    phonetic: v.phonetic,
                    definition: v.definition,
                    example: v.example,
                    exampleTranslation: v.translation,
                    reviewCount: v.review_count,
                    correctCount: v.correct_count || 0,
                    createdAt: v.created_at,
                    tags: v.tags || []
                }));
                setVocabulary(mappedVocab);
                toast.success("已从云端同步数据");
            }
        }
      }
      setSyncStatus('synced');
    } catch (error: any) {
      // 错误处理逻辑
      if (error.name === 'AbortError' || error.code === 20 || error.message?.includes('AbortError')) {
        // 网络中断或页面跳转导致的取消，静默失败或温和提示
        console.warn('Sync aborted due to timeout or navigation');
        toast.info("网络连接较慢，同步仍在后台尝试...");
      } else {
        console.error("Sync failed:", error);
        toast.error(`同步失败: ${error.message || "请检查网络"}`, {
          duration: 4000
        });
      }
      setSyncStatus('idle');
    }
  }, [localVocabulary, setVocabulary, syncStatus]);

  return {
    syncStatus,
    sync,
    isSyncing: syncStatus === 'syncing'
  };
}
