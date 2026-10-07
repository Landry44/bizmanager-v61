import {NextResponse} from "next/server";
import {db} from "@/src/lib/db";
import {requireMembership} from "@/src/lib/auth";
import {requirePlanFeature} from "@/src/lib/plan";
export async function GET(_:Request,{params}:{params:Promise<{companyId:string}>}){
 const {companyId}=await params;
 try{
  await requireMembership(companyId); const sub=await requirePlanFeature(companyId,"BASIC");
  const now=new Date(); const start=new Date(now.getFullYear(),now.getMonth(),1);
  const [sales,expenses,purchases,returns,products,customers]=await Promise.all([
   db.sale.aggregate({where:{companyId,createdAt:{gte:start}},_sum:{total:true},_count:true}),
   db.expense.aggregate({where:{companyId,createdAt:{gte:start}},_sum:{amount:true},_count:true}),
   db.purchase.aggregate({where:{companyId,createdAt:{gte:start}},_sum:{total:true},_count:true}),
   db.return.aggregate({where:{companyId,createdAt:{gte:start}},_sum:{amount:true},_count:true}),
   db.product.aggregate({where:{companyId},_sum:{stock:true},_count:true}),
   db.customer.count({where:{companyId}})
  ]);
  const revenue=sales._sum.total||0, expense=expenses._sum.amount||0, buying=purchases._sum.total||0, refunded=returns._sum.amount||0;
  const basic={period:start.toISOString(),salesCount:sales._count,revenue,expenses:expense,purchases:buying,estimatedResult:revenue-expense-buying,products:products._count,stockUnits:products._sum.stock||0,customers};
  if(sub.plan!=="ENTERPRISE") return NextResponse.json(basic);
  const [items,receivables,payables]=await Promise.all([
   db.saleItem.findMany({where:{sale:{companyId,createdAt:{gte:start}}},include:{product:true},take:5000}),
   db.customer.aggregate({where:{companyId,balance:{gt:0}},_sum:{balance:true}}),
   db.supplier.aggregate({where:{companyId,balance:{gt:0}},_sum:{balance:true}})
  ]);
  const margin=items.reduce((sum,i)=>sum+(i.unitPrice-i.product.purchasePrice)*i.quantity,0);
  const averageSale=sales._count?Math.round(revenue/sales._count):0;
  const topMap=new Map<string,{name:string,quantity:number,revenue:number}>();
  for(const i of items){const x=topMap.get(i.productId)||{name:i.product.name,quantity:0,revenue:0};x.quantity+=i.quantity;x.revenue+=i.total;topMap.set(i.productId,x)}
  const topProducts=[...topMap.values()].sort((a,b)=>b.revenue-a.revenue).slice(0,5);
  return NextResponse.json({...basic,returns:refunded,estimatedResult:revenue-expense-buying-refunded,advanced:true,grossMargin:margin,averageSale,receivables:receivables._sum.balance||0,payables:payables._sum.balance||0,topProducts});
 }catch(e:any){return NextResponse.json({error:e?.message||"Erreur",code:e?.code},{status:e?.message==="FORBIDDEN"?403:e?.code==="PLAN_UPGRADE_REQUIRED"?403:401})}
}
