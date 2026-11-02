/** Browser-only download. The browser decides where the generated file is saved. */
export function downloadFile(content:string,filename:string,type:string){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const link=document.createElement('a');
 try{link.href=url;link.download=filename;document.body.appendChild(link);link.click();}
 finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),10_000);}
}
