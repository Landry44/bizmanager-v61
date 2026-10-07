import {NextResponse} from "next/server";
import {z} from "zod";
import {requireMembership} from "@/src/lib/auth";
import {db} from "@/src/lib/db";
import {getSubscription,PLAN_LIMITS} from "@/src/lib/subscription";

export async function GET(_request:Request,{params}:{params:Promise<{companyId:string}>}){
 try{const {companyId}=await params;await requireMembership(companyId);const sub=await getSubscription(companyId);const orders=await db.paymentOrder.findMany({where:{companyId,provider:"MANUAL"},orderBy:{createdAt:"desc"},take:10});return NextResponse.json({subscription:sub,orders,plans:PLAN_LIMITS,featureMatrix:{basic:["Produits & stock","Ventes / caisse","Clients","Achats","Fournisseurs","Dépenses","Employés","Reçus","Trésorerie espèces"],advanced:["Tout Basic","Rapports avancés","Trésorerie complète","Factures / devis / bons de livraison / avoirs","Retours & remboursements","Paie avancée","Analyses de marge","Exports avancés"]}});}
 catch(e:any){return NextResponse.json({error:e?.message||"Accès refusé"},{status:e?.message==="UNAUTHENTICATED"?401:403});}
}

const schema=z.object({plan:z.enum(["FREE","BUSINESS","ENTERPRISE"])});
export async function POST(request:Request,{params}:{params:Promise<{companyId:string}>}){
 try{
  const {companyId}=await params;await requireMembership(companyId, ["OWNER","ADMIN"]);
  schema.safeParse(await request.json());
  return NextResponse.json({error:"La gestion des abonnements est centralisée par le Superadmin. Contactez BizManager pour activer ou modifier votre formule."},{status:403});
 }catch(e:any){return NextResponse.json({error:e?.message||"Accès refusé"},{status:e?.message==="UNAUTHENTICATED"?401:403});}
}


// Renewal requests are intentionally manual: the company requests a cash renewal,
// then the Superadmin validates the payment from the administration area.
export async function PUT(request:Request,{params}:{params:Promise<{companyId:string}>}){
 try{
  const {companyId}=await params;
  const membership=await requireMembership(companyId,["OWNER","ADMIN"]);
  const sub=await getSubscription(companyId);
  const plan=sub.plan;
  if(plan==="FREE") return NextResponse.json({error:"Choisissez d'abord une formule Basic ou Avancé."},{status:400});
  const limits=PLAN_LIMITS[plan];
  const existing=await db.paymentOrder.findFirst({where:{companyId,plan,status:"PENDING",provider:"MANUAL"},orderBy:{createdAt:"desc"}});
  if(existing) return NextResponse.json({ok:true,alreadyPending:true,order:existing});
  const order=await db.paymentOrder.create({data:{companyId,plan,amount:limits.price,currency:"XAF",provider:"MANUAL",status:"PENDING",metadata:{method:"CASH",requestedBy:membership.userId,requestType:"RENEWAL"}}});
  const admins=await db.membership.findMany({where:{companyId,role:{in:["OWNER","ADMIN"]}},select:{userId:true}});
  if(admins.length){await db.notification.createMany({data:admins.map(a=>({userId:a.userId,companyId,title:"Demande de renouvellement",message:`Une demande de renouvellement ${PLAN_LIMITS[plan].label} de ${limits.price.toLocaleString("fr-FR")} FCFA a été envoyée.`,type:"SUBSCRIPTION"}))});}
  return NextResponse.json({ok:true,order});
 }catch(e:any){return NextResponse.json({error:e?.message||"Impossible d'envoyer la demande."},{status:e?.message==="UNAUTHENTICATED"?401:403});}
}
