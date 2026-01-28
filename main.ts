import "jsr:@std/dotenv/load";
import { Octokit } from "https://esm.sh/octokit?dts";
import { timingSafeEqual } from "node:crypto";

const html = await Deno.readTextFile("index.html");

async function addMember(username: string) {
  const octokit = new Octokit({
    auth: Deno.env.get("GITHUB_TOKEN"),
  });

  const user = await octokit.rest.users.getByUsername({
    username: username,
  });

  const existingMembership = await octokit.rest.orgs
    .getMembershipForUser({
      org: "plfanzen",
      username: username,
    })
    .catch(() => null);

  if (existingMembership && existingMembership.status === 200) {
    return new Response(
      `${username} is already a member of the organization.`,
      { status: 200 },
    );
  }

  return octokit.rest.orgs.createInvitation({
    invitee_id: user.data.id,
    org: "plfanzen",
    role: "admin",
  });
}

Deno.serve(async (req) => {
  console.log("Method:", req.method);

  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/join") {
    const formData = await req.formData();
    const username = formData.get("username") as string;

    if (!username || typeof username !== "string") {
      return new Response("Username is required", { status: 400 });
    }

    const inviteCode = formData.get("inviteCode") as string;
    const expectedCode = Deno.env.get("INVITE_CODE");
    if (typeof inviteCode !== "string") {
      return new Response("Invalid invite code", { status: 403 });
    }

    if (!expectedCode) {
      return new Response("No invite code configured", { status: 500 });
    }

    const encoder = new TextEncoder();
    if (
      !timingSafeEqual(
        await crypto.subtle.digest("SHA-256", encoder.encode(inviteCode)),
        await crypto.subtle.digest("SHA-256", encoder.encode(expectedCode)),
      )
    ) {
      return new Response("Invalid invite code", { status: 403 });
    }

    try {
      const resp = await addMember(username);
      if (resp instanceof Response) {
        return resp;
      }
      return new Response(`Invitation sent to ${username}`, { status: 200 });
    } catch (error) {
      console.error("Error adding member:", error);
      return new Response("Failed to send invitation", { status: 500 });
    }
  } else {
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }
});
