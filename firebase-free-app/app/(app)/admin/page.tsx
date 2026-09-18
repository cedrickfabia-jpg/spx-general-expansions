"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { createUserProfile, listUsers, setUserActive, setUserRoles } from "@/lib/data";
import type { AppUser, RoleName } from "@/features/hod-approvals/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";
import { AccessDenied } from "@/components/access-denied";
import Link from "next/link";

const BULK_WATCHER_EMAILS = [
  "vu.nguyen@shopee.com", "therese.lucas@spxexpress.com", "dexter.bathan@spxexpress.com", "alma.quiambao@spxexpress.com",
  "rona.dimaano@spxexpress.com", "cedrick.fabia@spxexpress.com", "lance.bogarin@spxexpress.com", "jake.velasquez@spxexpress.com",
  "albert.nierras@spxexpress.com", "joebert.areglado@spxexpress.com", "catherine.delarea@spxexpress.com", "agnes.malaluan@spxexpress.com",
  "roger.morales@spxexpress.com", "joy.malabayabas@spxexpress.com", "chelle.mabalot@spxexpress.com", "jessica.calimpon@spxexpress.com",
  "daniel.calimag@spxexpress.com", "raphael.gutierrez@spxexpress.com", "azil.mendoza@spxexpress.com", "robiline.cuenco@spxexpress.com",
  "david.niro@spxexpress.com", "kevin.castillo@spxexpress.com", "cezar.puno@shopee.com", "kristin.tesorio@spxexpress.com",
  "melver.romano@spxexpress.com", "sedney.lumampao@spxexpress.com", "jester.alubog@spxexpress.com", "meriel.mendoza@spxexpress.com",
  "shiralie.iligan@spxexpress.com", "archelie.silvosa@spxexpress.com", "edu.haban@spxexpress.com", "norvin.magpayo@spxexpress.com",
  "jake.pidoc@spxexpress.com", "emmanuel.segobia@spxexpress.com", "kent.dorato@spxexpress.com", "reiner.saflor@spxexpress.com",
  "marco.salvador@spxexpress.com", "alexie.ramos@spxexpress.com", "xandra.nazario@spxexpress.com", "miriel.cabungcal@spxexpress.com",
  "krjun.senerez@spxexpress.com", "kim.lumansok@spxexpress.com", "rayand.gallo@spxexpress.com", "christopher.dorado@spxexpress.com",
  "leonard.perez@spxexpress.com", "monaliza.mangubat@spxexpress.com", "kevin.catbagan@spxexpress.com", "joel.giray@spxexpress.com",
  "sthephanie.popatco@spxexpress.com", "clarissa.deguzman@spxexpress.com", "apollo.calamanan@spxexpress.com", "shaira.gomez@spxexpress.com",
  "luis.ferrer@spxexpress.com", "charmaine.daligdig@spxexpress.com", "espie.berin@spxexpress.com", "bernard.importa@spxexpress.com",
  "jomil.raga@spxexpress.com", "trisha.ramos@spxexpress.com", "alvin.joren@spxexpress.com", "kenneth.frias@spxexpress.com",
  "vincent.fudolin@spxexpress.com", "jemuel.paguntalan@spxexpress.com", "jerick.senales@spxexpress.com", "romeo.abroguena@spxexpress.com",
  "jerson.devera@spxexpress.com", "james.paragili@spxexpress.com", "samantha.sereno@spxexpress.com", "gerric.martinez@spxexpress.com",
  "jomil.gutierrez@spxexpress.com", "julius.conol@spxexpress.com", "kathilynne.salud@spxexpress.com", "jhannel.lagumbay@spxexpress.com",
  "gizzalyn.nanas@spxexpress.com", "jacquelyn.gonzales@spxexpress.com", "ysabel.santos@spxexpress.com", "shaun.agay@spxexpress.com",
  "john.odper@spxexpress.com", "nathaniel.morales@spxexpress.com", "johnny.vocal@spxexpress.com", "jan.erasga@spxexpress.com",
  "pice.preeyakorn@spxexpress.com", "mariku.garcia@spxexpress.com", "edward.cagsawa@spxexpress.com", "rica.naman@spxexpress.com",
  "aurelio.noprada@spxexpress.com", "ali.abdulah@spxexpress.com", "arnel.tabaniag@spxexpress.com", "julio.quilaton@spxexpress.com",
  "jhim.carballo@shopee.com", "corpit.project.ph@shopee.com", "karl.kue@spxexpress.com", "boonfang.teo@spxexpress.com",
  "carlos.tolentino@spxexpress.com", "zoe.chensy@spxexpress.com", "jodie.ong@spxexpress.com", "jigmee.sherpa@spxexpress.com",
  "charles.rizon@spxexpress.com", "richard.martin@spxexpress.com", "erwin.fontanilla@spxexpress.com", "gazelleann.mojica@spxexpress.com",
  "guiller.oracion@spxexpress.com", "michael.gonzales@spxexpress.com", "sonali.gupta@spxexpress.com", "julio.villenas@spxexpress.com",
  "jan.gutierrez@spxexpress.com", "apple.aranas@spxexpress.com", "marichu.busano@spxexpress.com", "gino.camarillo@spxexpress.com",
  "chaitanyapvsk@spxexpress.com", "shalyn.kochappi@spxexpress.com", "maygan.clapis@spxexpress.com", "james.aguilar@spxexpress.com",
  "erin.tagudin@spxexpress.com", "kurt.recinto@spxexpress.com", "ryan.zhouys@spxexpress.com", "weixiang.tan@spxexpress.com",
  "abbie.fulgencio@spxexpress.com", "renato.beslinos@spxexpress.com", "gilbert.sia@spxexpress.com", "rocelle.peralta@spxexpress.com",
  "precious.ingco@spxexpress.com", "ava.policarpio@spxexpress.com", "gina.nisnisan@spxexpress.com", "greg.lucatin@spxexpress.com",
  "melanie.devera@spxexpress.com", "jan.gabriel@spxexpress.com", "blessie.adraneda@spxexpress.com", "louie.garrido@spxexpress.com",
  "shirley.negru@spxexpress.com", "joey.benavides@spxexpress.com", "eljay.sarito@spxexpress.com", "xerjohn.decastro@spxexpress.com",
  "joseph.espiritu@spxexpress.com", "loida.pogoy@spxexpress.com", "donald.agosto@spxexpress.com", "ralph.mandin@spxexpress.com",
  "leah.negrido@spxexpress.com", "andre.chavez@spxexpress.com", "katty.aberilla@spxexpress.com", "judebrian.fernandez@spxexpress.com",
  "anjelique.sasi@spxexpress.com", "kenneth.mendoza@spxexpress.com", "joshua.santiago@spxexpress.com", "romulo.terrado@shopee.com",
  "angela.porte@shopee.com", "christine.chua@shopee.com", "kenneth.gabion@shopee.com", "janine.arcilla@shopee.com",
  "mieco.oliveros@shopee.com", "pearl.delmundo@shopee.com", "ivee.kho@shopee.com", "mj.delamen@shopee.com",
  "surcor@sea.com", "bautistag@sea.com", "formentod@sea.com", "quynhcham.do@spxexpresspay.com",
  "ricarom@sea.com", "sanoriac@sea.com", "diazf@sea.com", "rhodenan.deguzman@spxexpress.com",
  "karlo.cajucom@spxexpress.com", "ricky.delrosario@spxexpress.com", "joana.aniciete@spxexpress.com", "davis.gaspar@spxexpress.com",
  "gerom.bangayan@spxexpress.com", "pablo.domingo@spxexpress.com", "ralph.togmoy@shopee.com", "allen.ordonez@spxexpress.com",
  "jose.cruz@spxexpress.com", "edward.rosales@spxexpress.com", "jayar.cortez@spxexpress.com", "adorabelle.aparicio@spxexpress.com",
  "joanna.aguilar@spxexpress.com", "mario.padua@spxexpress.com", "rogien.bornales@spxexpress.com", "peter.adlaon@spxexpress.com",
  "daphne.serrano@spxexpress.com", "arnold.javier@spxexpress.com", "neil.esperanza@spxexpress.com", "nikki.moradas@spxexpress.com",
  "mylene.quise@spxexpress.com", "charlene.aguaviva@spxexpress.com", "romeo.gabas@spxexpress.com", "mary.tan@spxexpress.com",
  "marco.joseph@spxexpress.com", "glenn.santos@spxexpress.com", "spxexpansions.ph@spxexpress.com", "charmaine.demorar@spxexpress.com",
  "audrey.masakayan@spxexpress.com", "precious.soriano@spxexpress.com", "angelou.madamo@spxexpress.com", "kisha.salunga@spxexpress.com"
];

function nameFromEmail(email: string): string {
  const local = email.split("@")[0];
  return local.split(".").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserRoles, setNewUserRoles] = React.useState<RoleName[]>(["REQUESTER"]);
  const [showInactive, setShowInactive] = React.useState(false);
  const [bulkEmails, setBulkEmails] = React.useState(BULK_WATCHER_EMAILS.join("\n"));
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [bulkResult, setBulkResult] = React.useState("");

  async function refreshUsers() { setUsers(await listUsers()); }

  React.useEffect(() => { refreshUsers(); }, []);

  if (!user?.roles.includes("ADMINISTRATOR")) {
    return <AccessDenied message="Administrator access required." />;
  }

  async function addUser() {
    for (const role of ["HOD_1", "HOD_2"] as RoleName[]) {
      if (newUserRoles.includes(role)) {
        for (const other of users) {
          if (other.roles.includes(role)) {
            await setUserRoles(other.id, other.roles.filter((r) => r !== role));
          }
        }
      }
    }
    await createUserProfile(newUserEmail, newUserName, newUserRoles);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRoles(["REQUESTER"]);
    await refreshUsers();
  }

  async function addBulkWatchers() {
    const emails = Array.from(new Set(bulkEmails.split("\n").map((line) => line.trim().toLowerCase()).filter(Boolean)));
    setBulkBusy(true);
    setBulkResult("");
    let added = 0;
    try {
      for (const email of emails) {
        await createUserProfile(email, nameFromEmail(email), ["WATCHER"]);
        added += 1;
      }
      setBulkResult(`Added/updated ${added} user${added === 1 ? "" : "s"} as Watcher.`);
      await refreshUsers();
    } catch (err) {
      setBulkResult(`Stopped after ${added} — ${err instanceof Error ? err.message : "failed"}.`);
    } finally {
      setBulkBusy(false);
    }
  }

  async function toggleRole(uid: string, role: RoleName) {
    const target = users.find((u) => u.id === uid);
    if (!target) return;
    const adding = !target.roles.includes(role);
    if (adding && (role === "HOD_1" || role === "HOD_2")) {
      for (const other of users) {
        if (other.id !== uid && other.roles.includes(role)) {
          await setUserRoles(other.id, other.roles.filter((r) => r !== role));
        }
      }
    }
    const newRoles = adding ? [...target.roles, role] : target.roles.filter((r) => r !== role);
    await setUserRoles(uid, newRoles);
    await refreshUsers();
  }

  async function toggleActive(uid: string, active: boolean) {
    await setUserActive(uid, active);
    await setUserRoles(uid, active ? ["WATCHER"] : []);
    await refreshUsers();
  }

  const visibleUsers = showInactive ? users : users.filter((u) => u.active);
  const roleLabel = (role: RoleName) => role === "HOD_1" ? "HOD 1" : role === "HOD_2" ? "HOD 2" : role.replace(/_/g, " ");

  return (
    <div className="space-y-6">
      <PageHeader title="User Access" description="Define users, assign roles, and control access." actions={<><Link href="/admin/errors"><Button variant="secondary">View Error Logs</Button></Link><Link href="/admin/privacy"><Button variant="secondary">Privacy &amp; Compliance</Button></Link><Link href="/changelog"><Button variant="secondary">Changelog</Button></Link></>} />

      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Define User</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div><Label htmlFor="new-user-name">Name</Label><Input id="new-user-name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} /></div>
          <div><Label htmlFor="new-user-email">Email</Label><Input id="new-user-email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="name@spxexpress.com" /></div>
          <div className="flex flex-wrap items-end gap-3">
            {(["REQUESTER", "HOD_1", "HOD_2", "WATCHER", "ADMINISTRATOR"] as RoleName[]).map((role) => (
              <label key={role} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={newUserRoles.includes(role)} onChange={(e) => setNewUserRoles((prev) => e.target.checked ? [...prev, role] : prev.filter((r) => r !== role))} />
                {roleLabel(role)}
              </label>
            ))}
            <Button onClick={addUser}>Add User</Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Bulk Add as Watchers</h2>
        <p className="mt-1 text-xs text-muted-foreground">One email per line. Each is added (or updated) with the Watcher role only — promote individuals afterward using the roles below.</p>
        <Textarea className="mt-3 font-mono text-xs" rows={6} value={bulkEmails} onChange={(e) => setBulkEmails(e.target.value)} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button disabled={bulkBusy} onClick={addBulkWatchers}>{bulkBusy ? "Adding..." : "Add as Watchers"}</Button>
          {bulkResult ? <p className="text-xs text-muted-foreground">{bulkResult}</p> : null}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Users</h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive users</label>
            <Button variant="secondary" onClick={() => downloadCsv("users.csv", ["Name", "Email", "Roles", "Active"], visibleUsers.map((u) => [u.name, u.email, u.roles.join(", "), u.active ? "Yes" : "No"]))}>Export CSV</Button>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {visibleUsers.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email} · {(u.roles.map(roleLabel)).join(", ") || "No roles"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["REQUESTER", "HOD_1", "HOD_2", "WATCHER", "ADMINISTRATOR"] as RoleName[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(u.id, role)}
                    className={u.roles.includes(role) ? "rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground" : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"}
                  >
                    {roleLabel(role)}
                  </button>
                ))}
                <Button variant={u.active ? "destructive" : "secondary"} onClick={() => toggleActive(u.id, !u.active)}>
                  {u.active ? "Remove Access" : "Restore Access"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
