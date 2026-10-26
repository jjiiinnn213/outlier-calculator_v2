'use strict';
function quantile(values,p) {
    const a=[...values].sort((a,b)=>a-b), pos=(a.length-1)*p, lo=Math.floor(pos), f=pos-lo;
    return a[lo]+(a[Math.ceil(pos)]-a[lo])*f;
}
function mean(a) {return a.reduce((s,x)=>s+x,0)/a.length;}
function std(a,ddof=0) {if(a.length<=ddof)return null; const m=mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-ddof));}
function computeResults(table,sample) {
    const rows=[];
    for(let i=0;i<table['No.'].length;i++) {
        const s=table['size(nm)'][i],p=table.PI[i];
        if(s!==null && s!=='' && p!==null && p!=='' && Number.isFinite(Number(s)) && Number.isFinite(Number(p))) rows.push({'No.':rows.length+1,'size(nm)':Number(s),PI:Number(p)});
    }
    if(!rows.length)throw new Error('유효한 데이터가 없습니다. size와 PI를 모두 입력하세요.');
    const a=rows.map(r=>r['size(nm)']), med=quantile(a,.5),mad=quantile(a.map(x=>Math.abs(x-med)),.5),q1=quantile(a,.25),q3=quantile(a,.75),iqr=q3-q1,mu=mean(a),sigma=std(a);
    const result={status:'success',sample_name:sample,original_data:rows,original_count:rows.length};
    for(const [key,name,isOutlier] of [
        ['zscore','z-score',x=>sigma!==0 && Math.abs((x-mu)/sigma)>=3],
        ['iqr','IQR',x=>x<q1-1.5*iqr || x>q3+1.5*iqr],
        ['mad','MAD',x=>mad!==0 && Math.abs(.6745*(x-med)/mad)>3.5]
    ]) {
        const data=rows.filter(r=>!isOutlier(r['size(nm)'])).map((r,i)=>({...r,'No.':i+1}));
        const sizes=data.map(r=>r['size(nm)']),pis=data.map(r=>r.PI);
        result[key]={name,data,count:data.length,size_mean:data.length?mean(sizes):null,size_std:std(sizes,1),pi_mean:data.length?mean(pis):null,pi_std:std(pis,1)};
    }
    return result;
}
function formatStat(x){return Number.isFinite(x)?x.toFixed(3):'—';}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function csvText(result) {
    const lines=[],field=v=>'"'+String(v??'').replace(/"/g,'""')+'"',line=(...v)=>lines.push(v.map(field).join(','));
    line('샘플명',result.sample_name);line('계산일시',new Date().toLocaleString('ko-KR'));line();
    const table=rows=>{line('No.','size(nm)','PI');rows.forEach(r=>line(r['No.'],r['size(nm)'],r.PI));line();};
    line('=== 원본 데이터 ===');line('총 데이터',result.original_count);table(result.original_data);
    for(const key of ['zscore','iqr','mad']) {const r=result[key];line(`=== ${r.name} 이상치 제거 결과 ===`);line('처리된 데이터 개수',r.count);line('size(nm) 평균',formatStat(r.size_mean));line('size(nm) 표준편차',formatStat(r.size_std));line('PI 평균',formatStat(r.pi_mean));line('PI 표준편차',formatStat(r.pi_std));table(r.data);}
    return '\ufeff'+lines.join('\r\n');
}
function saveCSV(result) {
    const url=URL.createObjectURL(new Blob([csvText(result)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download=`outlier_results_${result.sample_name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')}_${Date.now()}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
if(typeof module!=='undefined') module.exports={computeResults,quantile,std,csvText};
