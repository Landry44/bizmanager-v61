import {NextResponse} from "next/server";
import {db} from "@/src/lib/db";
import {requireMembership} from "@/src/lib/auth";
import {requirePlanFeature} from "@/src/lib/plan";
function csv(rows:any[],headers:string[]){const q=(v:any)=>`"${String(v??"").replaceAll('"','""')}"`;return [headers.join(','),...rows.map(r=>headers.map(h=>q(r[h])).join(','))].join('\n')}
export async function GET(req:Request,{params}:{params:Promise<{companyId:string}>}){
 const {companyId}=await params;try{await requireMembership(companyId);await requirePlanFeature(companyId,"ADVANCED_REPORTS");const type=new URL(req.url).searchParams.get('type')||'sales';let body='',filename='';
 if(type==='products'){const rows=await db.product.findMany({where:{companyId},orderBy:{name:'asc'}});body=csv(rows,['sku','name','purchasePrice','salePrice','stock','minStock']);filename='produits.csv'}
 else if(type==='customers'){const rows=await db.customer.findMany({where:{companyId},orderBy:{name:'asc'}});body=csv(rows,['name','phone','balance']);filename='clients.csv'}
 else {const rows=await db.sale.findMany({where:{companyId},orderBy:{createdAt:'desc'},take:10000});body=csv(rows.map(r=>({...r,createdAt:r.createdAt.toISOString()})),['id','createdAt','total','payment','customerId']);filename='ventes.csv'}
 return new NextResponse(body,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${filename}"`}})
 }catch(e:any){return NextResponse.json({error:e?.message||'Accès refusé',code:e?.code},{status:e?.code==='PLAN_UPGRADE_REQUIRED'?403:403})}
}
