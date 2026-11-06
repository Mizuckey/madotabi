"use client";

import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { BgmLink } from '@/types/bgm';
import { parseBgmUrl, readBgmSelection, writeBgmSelection } from '@/lib/bgm';

export function BgmMenu({supabase,userId}:{supabase:SupabaseClient;userId:string}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const urlInput=useRef<HTMLInputElement>(null);
  const [open,setOpen]=useState(false);
  const [links,setLinks]=useState<BgmLink[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [url,setUrl]=useState('');
  const [title,setTitle]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [showArchived,setShowArchived]=useState(false);
  const [editing,setEditing]=useState<{id:string;title:string}|null>(null);
  const [selectedId,setSelectedId]=useState<string|null>(()=>{
    if(typeof window==='undefined')return null;
    try{return readBgmSelection(window.sessionStorage,userId)}catch{return null}
  });
  const current=links.find(link=>link.id===selectedId&&!link.archived);
  const busy=loading||saving;
  const visible=links.filter(link=>link.archived===showArchived);
  const load=useCallback(async(signal?:AbortSignal)=>{
    const rows:BgmLink[]=[];
    for(let offset=0;;offset+=100){
      const query=supabase.from('bgm_links').select('id,title,url,archived').eq('created_by',userId).order('created_at').order('id').range(offset,offset+99);
      const {data,error}=await (signal?query.abortSignal(signal):query).returns<BgmLink[]>();
      if(signal?.aborted)return null;
      if(error)throw new Error('BGM list unavailable');
      rows.push(...(data??[]));if(!data||data.length<100)break;
    }
    return rows;
  },[supabase,userId]);
  useEffect(()=>{
    const controller=new AbortController();
    void load(controller.signal).then(rows=>{if(rows)setLinks(rows)}).catch(()=>{if(!controller.signal.aborted)setError('BGMリストを読み込めませんでした。更新して再度お試しください。')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[load]);
  function select(id:string|null){
    setSelectedId(id);
    try{writeBgmSelection(window.sessionStorage,userId,id)}catch{/* Session storage may be disabled. */}
  }
  async function reload(){
    setLoading(true);setError('');
    try{const rows=await load();if(rows)setLinks(rows)}catch{setError('BGMリストを取得できませんでした。')}
    finally{setLoading(false)}
  }
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;
    const parsed=parseBgmUrl(url);
    if(!parsed){setError('HTTPSのBGMリンクを入力してください。YouTube、radikoなどのURLを登録できます。');return}
    const name=title.trim()||parsed.suggestedTitle;
    if(name.length>100){setError('名前は100文字以内で入力してください。');return}
    setSaving(true);setError('');setNotice('');
    try{
      const {error}=await supabase.from('bgm_links').insert({created_by:userId,title:name,url:parsed.url});
      if(error){setError(error.code==='23505'?'このURLは登録済みです。非表示にしたBGMも確認してください。':'保存できませんでした。再度お試しください。');return}
      setUrl('');setTitle('');setShowArchived(false);setNotice('BGMリンクを登録しました。続けて追加できます。');
      try{const rows=await load();if(rows)setLinks(rows)}catch{setError('保存は完了しましたが、一覧を更新できませんでした。更新して確認してください。')}
      requestAnimationFrame(()=>urlInput.current?.focus());
    }catch{setError('保存結果を確認できませんでした。更新して確認してください。')}
    finally{setSaving(false)}
  }
  async function update(item:BgmLink,patch:{archived?:boolean;title?:string}){
    if(busy)return;
    setSaving(true);setError('');setNotice('');
    try{
      const {data,error}=await supabase.from('bgm_links').update(patch).eq('id',item.id).eq('created_by',userId).select('id,title,url,archived').single<BgmLink>();
      if(error||!data)throw new Error('BGM update failed');
      setLinks(current=>current.map(row=>row.id===data.id?data:row));setEditing(null);
      if(data.archived&&selectedId===data.id)select(null);
    }catch{setError('変更結果を確認できませんでした。更新して確認してください。')}
    finally{setSaving(false)}
  }
  return <>
    <button className="bgm-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={current?`BGM（再生中：${current.title}）`:'BGM'} title={current?`再生中：${current.title}`:'BGMリンクを開く'} onClick={()=>{dialog.current?.showModal();setOpen(true)}}>BGM{current&&<span className="status-dot" aria-hidden="true"/>}</button>
    <dialog className="bgm-dialog" ref={dialog} aria-labelledby="bgm-heading" onClose={()=>setOpen(false)}>
      <div className="bgm-dialog-heading"><h2 id="bgm-heading">BGM</h2><button className="admin-secondary" type="button" onClick={()=>dialog.current?.close()}>閉じる</button></div>
      <p className="admin-field-hint">外部タブで開きます。「再生中」は最後に開いたリンクの表示で、外部サイトの再生・停止とは連動しません。</p>
      {current&&<div className="bgm-current" role="status"><span>再生中：{current.title}</span><button className="admin-secondary" type="button" onClick={()=>select(null)}>表示を解除</button></div>}
      {error&&<p className="admin-error" role="alert">{error}</p>}{notice&&<p className="admin-field-hint" role="status">{notice}</p>}
      <form className="admin-form bgm-add-form" onSubmit={save}>
        <label htmlFor="bgm-url">BGMのURL</label><input ref={urlInput} id="bgm-url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={2048} value={url} disabled={busy} onChange={event=>setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…"/>
        <label htmlFor="bgm-title">名前 <span className="admin-optional">任意</span></label><input id="bgm-title" maxLength={100} value={title} disabled={busy} onChange={event=>setTitle(event.target.value)} placeholder="例：作業用ジャズ"/>
        <button className="admin-secondary" type="submit" disabled={busy}>BGMを登録</button>
      </form>
      <div className="scenery-list-tabs"><button className="admin-secondary" type="button" aria-pressed={!showArchived} onClick={()=>{setShowArchived(false);setEditing(null)}}>BGMリスト</button><button className="admin-secondary" type="button" aria-pressed={showArchived} onClick={()=>{setShowArchived(true);setEditing(null)}}>非表示にしたBGM</button><button className="admin-secondary" type="button" disabled={busy} onClick={()=>void reload()}>更新</button></div>
      {loading?<p role="status">BGMを読み込んでいます…</p>:!visible.length?<p className="admin-field-hint">{showArchived?'非表示にしたBGMはありません。':'BGMリンクはまだありません。URLを登録してください。'}</p>:<ul className="bgm-list">{visible.map(item=>{
        const safe=parseBgmUrl(item.url);
        return <li key={item.id} data-bgm-playing={current?.id===item.id}>
          <div className="bgm-link-main">{!item.archived&&safe?<a href={safe.url} target="_blank" rel="noopener noreferrer" onClick={()=>select(item.id)} onAuxClick={event=>{if(event.button===1)select(item.id)}}>{item.title} ↗</a>:<span>{item.title}</span>}{current?.id===item.id&&<span className="bgm-playing-label">再生中</span>}<small>{item.url}</small></div>
          <div className="bgm-row-actions">{item.archived?<button className="admin-secondary" type="button" disabled={busy} onClick={()=>void update(item,{archived:false})}>戻す</button>:<><button className="admin-secondary" type="button" disabled={busy} onClick={()=>setEditing({id:item.id,title:item.title})}>名前を編集</button><button className="admin-secondary" type="button" disabled={busy} onClick={()=>void update(item,{archived:true})}>非表示</button></>}</div>
          {editing?.id===item.id&&<form className="admin-form bgm-edit-form" onSubmit={event=>{event.preventDefault();const name=editing.title.trim();if(!name){setError('名前を入力してください。');return}void update(item,{title:name})}}><label htmlFor={`bgm-edit-${item.id}`}>名前</label><input id={`bgm-edit-${item.id}`} required maxLength={100} value={editing.title} disabled={busy} onChange={event=>setEditing({...editing,title:event.target.value})}/><div><button className="admin-secondary" type="submit" disabled={busy}>保存</button><button className="admin-secondary" type="button" disabled={busy} onClick={()=>setEditing(null)}>キャンセル</button></div></form>}
        </li>;
      })}</ul>}
    </dialog>
  </>;
}
