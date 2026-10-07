import {NextResponse} from "next/server";

export async function POST(){
 return NextResponse.json({error:"Le paiement en ligne est désactivé pour le moment. Les abonnements sont réglés en espèces et validés par le Superadmin."},{status:410});
}
