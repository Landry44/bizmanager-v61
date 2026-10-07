import {NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/src/lib/db";
import {requireSuperAdmin} from "@/src/lib/auth";
import {PLAN_LIMITS} from "@/src/lib/subscription";

export async function GET(){
 try{
  await requireSuperAdmin();
  const companies=await db.company.findMany({orderBy:{createdAt:"desc"},include:{subscription:true,memberships:{include:{user:true}},_count:{select:{products:true,customers:true,sales:true}}}});
  return NextResponse.json({companies:companies.map(c=>({id:c.id,name:c.name,legalName:c.legalName,phone:c.phone,email:c.email,createdAt:c.createdAt,users:c.memberships.length,owner:c.memberships.find(m=>m.role==="OWNER")?.user.email||null,counts:c._count,subscription:c.subscription}))});
 }catch(e:any){return NextResponse.json({error:e?.message||"Accès refusé"},{status:e?.message==="UNAUTHENTICATED"?401:403});}
}

const schema=z.object({companyId:z.string().min(1),plan:z.enum(["FREE","BUSINESS","ENTERPRISE"]),status:z.enum(["TRIALING","ACTIVE","PAST_DUE","CANCELED"]),months:z.number().int().min(0).max(24).default(1),note:z.string().max(500).optional()});

export async function PATCH(request:Request){
 try{
  const admin=await requireSuperAdmin();
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Données invalides."},{status:400});
  const {companyId,plan,status,months,note}=parsed.data; const limits=PLAN_LIMITS[plan]; const now=new Date();
  const end=new Date(now); end.setMonth(end.getMonth()+months);
  const sub=await db.$transaction(async tx=>{
   const subscription=await tx.subscription.upsert({where:{companyId},create:{companyId,plan,status,trialEndsAt:plan==="FREE"?new Date(now.getTime()+14*86400000):now,currentPeriodEnd:months>0?end:null,maxUsers:limits.maxUsers,maxProducts:limits.maxProducts},update:{plan,status,trialEndsAt:plan==="FREE"?new Date(now.getTime()+14*86400000):now,currentPeriodEnd:months>0?end:null,maxUsers:limits.maxUsers,maxProducts:limits.maxProducts}});
   if(plan!=="FREE" && status==="ACTIVE" && months>0){
    await tx.paymentOrder.create({data:{companyId,plan,amount:limits.price,currency:"XAF",provider:"MANUAL",status:"PAID",paidAt:now,metadata:{method:"CASH",validatedBy:admin.id,note:note||null,months}}});
   }
   await tx.auditLog.create({data:{action:"SUBSCRIPTION_CHANGE",entity:"Subscription",entityId:subscription.id,actorId:admin.id,companyId,metadata:{plan,status,months,method:plan!=="FREE"&&status==="ACTIVE"?"CASH":null,note:note||null}}});
   return subscription;
  });
  return NextResponse.json({ok:true,subscription:sub});
 }catch(e:any){return NextResponse.json({error:e?.message||"Impossible de modifier l'abonnement."},{status:e?.message==="UNAUTHENTICATED"?401:403});}
}
