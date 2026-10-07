import {redirect} from "next/navigation";
import {getCurrentUser} from "@/src/lib/auth";
import SuperadminClient from "./SuperadminClient";
export default async function SuperadminPage(){const u=await getCurrentUser();if(!u)redirect("/login");if(!u.isSuperAdmin)redirect("/dashboard");return <SuperadminClient user={{email:u.email,firstName:u.firstName,lastName:u.lastName}}/>;}