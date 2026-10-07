import {NextResponse} from "next/server";
import {db} from "@/src/lib/db";
import {requireSuperAdmin} from "@/src/lib/auth";

export async function GET(){
 try{
  await requireSuperAdmin();
  const now=new Date();
  const [companies,activeBasic,activeAdvanced,pending,paid,orders]=await Promise.all([
   db.company.count(),
   db.subscription.count({where:{plan:"BUSINESS",status:"ACTIVE",OR:[{currentPeriodEnd:null},{currentPeriodEnd:{gte:now}}]}}),
   db.subscription.count({where:{plan:"ENTERPRISE",status:"ACTIVE",OR:[{currentPeriodEnd:null},{currentPeriodEnd:{gte:now}}]}}),
   db.paymentOrder.count({where:{status:"PENDING"}}),
   db.paymentOrder.aggregate({where:{status:"PAID",provider:"MANUAL"},_sum:{amount:true},_count:{_all:true}}),
   db.paymentOrder.findMany({where:{status:"PAID"},orderBy:{paidAt:"desc"},take:20,include:{company:{select:{id:true,name:true}}}})
  ]);
  return NextResponse.json({companies,activeBasic,activeAdvanced,pendingPayments:pending,revenue:paid._sum.amount||0,paidOrders:paid._count._all,orders});
 }catch(e:any){return NextResponse.json({error:e?.message||"Accès refusé"},{status:e?.message==="UNAUTHENTICATED"?401:403});}
}
