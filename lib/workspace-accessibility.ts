export type ShortcutInput={key:string;metaKey?:boolean;ctrlKey?:boolean;altKey?:boolean;shiftKey?:boolean;isComposing?:boolean;repeat?:boolean;defaultPrevented?:boolean;editing?:boolean;modal?:boolean;paletteOpen?:boolean};
export function workspaceShortcut(event:ShortcutInput){
 if(event.defaultPrevented||event.isComposing||event.repeat||event.altKey)return null;
 if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k')return event.modal&&!event.paletteOpen?null:'palette';
 if(event.metaKey||event.ctrlKey||event.editing||event.modal)return null;
 return event.key==='/'?'url':event.key==='?'?'shortcuts':null;
}
export function nextCommandIndex(index:number,key:string,count:number){
 if(count<=0)return -1;
 if(key==='Home')return 0;if(key==='End')return count-1;
 return (index+(key==='ArrowUp'?-1:1)+count)%count;
}
/** Use the same destination after route effects and modal focus restoration. */
export const blockingDialogSelector='[role="dialog"]:not([aria-modal="false"])';
export function focusWorkspaceContent(){
 const finding=new URLSearchParams(window.location.search).get('finding');
 const target=finding&&(document.getElementById(`finding-${finding}`)||document.getElementById(`task-${finding}`));
 (target||document.getElementById('workspace-title'))?.focus({preventScroll:true});
}
export function editingTarget(target:EventTarget|null){return target instanceof HTMLElement&&!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');}
