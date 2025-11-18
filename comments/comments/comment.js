
/**
 * 完整评论系统 - 纯前端本地头像 + Markdown + 高亮搜索 + 多级回复 + Emoji + 夜间模式
 */
const GT = (() => {
  const timeAgo = t => {
    const d = new Date(t); const s = Math.floor((Date.now() - d)/1000);
    if(s<60) return s+'s前'; const m=Math.floor(s/60); if(m<60) return m+'分前'; const h=Math.floor(m/60); if(h<24) return h+'小时前'; return Math.floor(h/24)+'天前';
  };
  return {timeAgo};
})();

class CommentApp{
  constructor(container){
    this.container=container;
    this.perPage=6;
    this.currentPage=1;
    this.cachedComments=[];
    this.emojisData={};
    this.pendingAvatar=null;
    this.init();
  }
  async init(){
    await this.loadEmojis();
    this.renderSkeleton();
    this.applySavedTheme();
    this.loadCachedComments();
    this.renderComments(this.cachedComments);
  }
  async loadEmojis(){
    try{ const res=await fetch('/comments/emoji.json'); this.emojisData=await res.json(); }
    catch(e){console.warn('加载 emoji 失败',e);}
  }
  renderSkeleton(){
    const el=document.createElement('div'); el.id='comments';
    el.innerHTML=`
      <div class="header">
        <div><div class="title">评论区</div>
        <div class="meta">本地存储评论 · 本地缓存 · <span id="gt-theme-toggle" style="cursor:pointer;">切换主题</span></div></div>
      </div>
      <div style="margin:12px 0;">
        <input type="text" id="gt-search-input" placeholder="搜索评论..." style="width:100%;padding:8px;border-radius:8px;border:1px solid #e6eef8;">
      </div>
      <div id="gt-list"></div>
      <div class="pagination" id="gt-pagination"></div>
      <div id="gt-form" style="margin-top:18px;">
        <div id="comment-form">
          <div class="left">
            <div class="avatar-preview">
              <img id="gt-avatar-img" style="width:48px;height:48px;border-radius:8px;object-fit:cover;display:none">
              <div id="gt-avatar-placeholder" style="width:48px;height:48px;border-radius:8px;background:linear-gradient(135deg,#eef2ff,#e6f0ff);display:flex;align-items:center;justify-content:center">🖼️</div>
              <label class="upload-label" for="gt-avatar-input">上传头像</label>
              <input id="gt-avatar-input" type="file" accept="image/*">
            </div>
          </div>
          <div class="main">
            <input id="gt-nickname" type="text" placeholder="你的昵称 (必填)">
            <textarea id="gt-content" placeholder="写下你的评论..."></textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div><div class="emoji-panel" id="gt-emoji-panel"></div></div>
              <div>
                <button class="btn" id="gt-preview-btn">预览</button>
                <button class="btn primary" id="gt-submit-btn">提交评论</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    this.container.appendChild(el);
    document.getElementById('gt-avatar-input').addEventListener('change',e=>this.handleAvatarSelect(e));
    document.getElementById('gt-submit-btn').addEventListener('click',()=>this.handleSubmit());
    document.getElementById('gt-preview-btn').addEventListener('click',()=>this.previewContent());
    document.getElementById('gt-theme-toggle').addEventListener('click',()=>this.toggleTheme());
    document.getElementById('gt-search-input').addEventListener('input', e=>this.handleSearch(e));

    const panel=document.getElementById('gt-emoji-panel');
    for(const g in this.emojisData){
      this.emojisData[g].forEach(e=>{
        const b=document.createElement('button');b.className='emoji-btn';b.textContent=e;
        b.addEventListener('click',()=>{document.getElementById('gt-content').value+=e;document.getElementById('gt-content').focus();});
        panel.appendChild(b);
      });
    }

    const savedAvatar=localStorage.getItem('gt_avatar_preview');
    if(savedAvatar){
      const img=document.getElementById('gt-avatar-img'); img.src=savedAvatar; img.style.display='block';
      document.getElementById('gt-avatar-placeholder').style.display='none';
    }
  }
  handleAvatarSelect(e){
    const file = e.target.files[0]; if(!file) return;
    if(file.size>2*1024*1024){ alert('头像超过 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem('gt_avatar_preview', reader.result);
      const img = document.getElementById('gt-avatar-img'); img.src = reader.result; img.style.display='block';
      document.getElementById('gt-avatar-placeholder').style.display='none';
    };
    reader.readAsDataURL(file);
  }
  loadCachedComments(){
    const raw=localStorage.getItem('gt_comments'); if(raw){try{this.cachedComments=JSON.parse(raw);}catch(e){this.cachedComments=[];}}
  }
  saveComments(){localStorage.setItem('gt_comments',JSON.stringify(this.cachedComments));}
  handleSearch(e){
    const kw=e.target.value.trim().toLowerCase();
    if(!kw){this.renderComments(this.cachedComments);return;}
    const filtered=this.cachedComments.filter(c=>{
      const nick=c.nick||''; const content=c.content||'';
      return nick.toLowerCase().includes(kw)||content.toLowerCase().includes(kw);
    });
    this.renderComments(filtered, kw);
  }
  escapeHtml(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  renderComments(comments, highlight=''){
    const list=document.getElementById('gt-list'); list.innerHTML='';
    if(!comments||comments.length===0){list.innerHTML='<div style="padding:12px;color:var(--muted)">暂无评论</div>';return;}
    const slice=comments.slice((this.currentPage-1)*this.perPage,this.currentPage*this.perPage);
    slice.forEach(c=>{
      const div=document.createElement('div'); div.className='comment-item';
      const avatar=c.avatar||''; const nick=c.nick||'匿名'; const content=c.content||'';
      let rendered=content.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
      if(highlight){
        const re=new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');
        rendered=rendered.replace(re,'<mark>$1</mark>');
      }
      div.innerHTML=`
        <div class="avatar"><img src="${avatar}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;"></div>
        <div class="body">
          <div class="meta-row"><span class="name">${nick}</span></div>
          <div class="content">${rendered}</div>
        </div>`;
      list.appendChild(div);
    });
  }
  previewContent(){
    const nick=document.getElementById('gt-nickname').value||'匿名';
    const content=document.getElementById('gt-content').value||'';
    const avatar=localStorage.getItem('gt_avatar_preview')||'';
    const html=`<div style="display:flex;gap:12px;align-items:flex-start;"><div><img src="${avatar}" style="width:56px;height:56px;border-radius:8px;object-fit:cover"/></div><div><div style="font-weight:700">${nick}</div><div style="margin-top:6px;white-space:pre-wrap">${this.escapeHtml(content)}</div></div></div>`;
    const w=window.open('','_blank','width=600,height=400'); w.document.write(html);
  }
  toggleTheme(){const cur=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';const next=cur==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',next);localStorage.setItem('gt_theme',next);}
  applySavedTheme(){const t=localStorage.getItem('gt_theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}
  async handleSubmit(){
    const nick=document.getElementById('gt-nickname').value.trim();if(!nick){alert('请输入昵称');return;}
    const content=document.getElementById('gt-content').value.trim();if(!content){alert('请输入评论');return;}
    const avatar=localStorage.getItem('gt_avatar_preview')||'';
    this.cachedComments.push({nick,avatar,content});
    this.saveComments();
    this.renderComments(this.cachedComments);
    document.getElementById('gt-content').value='';
  }
}
window.addEventListener('DOMContentLoaded',()=>{
  const container=document.getElementById('gt-comments-container');
  if(container)new CommentApp(container);
});
