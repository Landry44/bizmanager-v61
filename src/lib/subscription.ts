import {db} from "@/src/lib/db";

export const PLAN_LIMITS={
 FREE:{maxUsers:2,maxProducts:100,price:0,label:"Free"},
 BUSINESS:{maxUsers:5,maxProducts:5000,price:7500,label:"Basic"},
 ENTERPRISE:{maxUsers:10,maxProducts:50000,price:10000,label:"Avancé"},
} as const;

export async function ensureSubscription(companyId:string){
 const existing=await db.subscription.findUnique({where:{companyId}});
 if(existing)return existing;
 const trialEndsAt=new Date(Date.now()+14*24*60*60*1000);
 return db.subscription.create({data:{companyId,trialEndsAt,maxUsers:2,maxProducts:100}});
}

export async function getSubscription(companyId:string){
 const sub=await ensureSubscription(companyId);
 if(sub.status==='TRIALING' && sub.trialEndsAt < new Date()){
   return db.subscription.update({where:{companyId},data:{status:'CANCELED'}});
 }
 return sub;
}

export function planActive(sub:{status:string;trialEndsAt:Date;currentPeriodEnd:Date|null}){
 const now=new Date();
 if(sub.status==='ACTIVE') return !sub.currentPeriodEnd || sub.currentPeriodEnd>=now;
 return sub.status==='TRIALING' && sub.trialEndsAt>=now;
}
