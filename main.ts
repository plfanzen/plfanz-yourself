import "jsr:@std/dotenv/load";
import { Octokit } from "https://esm.sh/octokit?dts";

const html = await Deno.readTextFile("index.html");

async function addMember(username: string) {
  const octokit = new Octokit({
    auth: Deno.env.get("GITHUB_TOKEN"),
  });
  
  const user = await octokit.rest.users.getByUsername({
    username: username,
  });

  return octokit.rest.orgs.createInvitation({
    invitee_id: user.data.id,
    org: "plfanzen",
  });
}

Deno.serve(async (req) => {
  console.log("Method:", req.method);

  const url = new URL(req.url);
  
  if (req.method === "POST" && url.pathname === "/join") {
    const formData = await req.formData();
    const username = formData.get("username") as string;

    if (!username) {
      return new Response("Username is required", { status: 400 });
    }
    
    const inviteCode = formData.get("inviteCode") as string;
    if (inviteCode !== Deno.env.get("INVITE_CODE")) {
      return new Response("Invalid invite code", { status: 403 });
    }

    try {
      await addMember(username);
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
