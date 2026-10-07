import {NextResponse} from "next/server";
import {db} from "@/src/lib/db";
import {genericProvider} from "@/src/lib/payments";
import {PLAN_LIMITS} from "@/src/lib/subscription";

export async function POST(request:Request){
 const raw=await request.text();const sig=request.headers.get("x-webhook-signature")||"";
 if(!genericProvider.verifyWebhook(raw,sig))return NextResponse.json({error:"Signature invalide."},{status:401});
 let body:any;try{body=JSON.parse(raw)}catch{return NextResponse.json({error:"JSON invalide."},{status:400})}
 const orderId=String(body.orderId||"");const paid=body.status==="PAID";if(!orderId)return NextResponse.json({error:"orderId manquant."},{status:400});
 const result=await db.$transaction(async tx=>{
  const order=await tx.paymentOrder.findUnique({where:{id:orderId}});if(!order)return null;
  if(order.status==="PAID")return order;
  if(!paid){await tx.paymentOrder.update({where:{id:order.id},data:{status:"FAILED"}});return null;}
  const limits=PLAN_LIMITS[order.plan];const end=new Date();end.setMonth(end.getMonth()+1);
  await tx.paymentOrder.update({where:{id:order.id},data:{status:"PAID",paidAt:new Date()}});
  await tx.subscription.upsert({where:{companyId:order.companyId},create:{companyId:order.companyId,plan:order.plan,status:"ACTIVE",trialEndsAt:new Date(),currentPeriodEnd:end,maxUsers:limits.maxUsers,maxProducts:limits.maxProducts},update:{plan:order.plan,status:"ACTIVE",currentPeriodEnd:end,maxUsers:limits.maxUsers,maxProducts:limits.maxProducts}});
  await tx.auditLog.create({data:{action:"SUBSCRIPTION_CHANGE",entity:"Subscription",companyId:order.companyId,metadata:{source:"payment_webhook",orderId:order.id,plan:order.plan}}});
  return order;
 });
 return NextResponse.json({ok:true,processed:!!result});
}
