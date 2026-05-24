import request from "supertest";
import { app } from "../src/app";

async function register(email: string, name = "Demo User") {
  await request(app).post("/api/auth/register").send({ name, email, password: "Password123!" }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password: "Password123!" }).expect(200);
  return login.body.data as { accessToken: string; refreshToken: string; user: { id: string; email: string } };
}

describe("TaskFlow API", () => {
  it("registers and logs in a user", async () => {
    const auth = await register("owner@test.dev", "Owner");
    expect(auth.accessToken).toBeTruthy();
    expect(auth.user.email).toBe("owner@test.dev");
  });

  it("rejects protected routes without auth", async () => {
    await request(app).get("/api/users/me").expect(401);
  });

  it("returns a configuration error when OAuth provider secrets are missing", async () => {
    const response = await request(app).get("/api/auth/oauth/google").expect(501);
    expect(response.body.message).toContain("google OAuth is not configured");
  });

  it("creates a workspace and assigns creator as owner", async () => {
    const auth = await register("owner@test.dev", "Owner");
    const created = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({ name: "Engineering" })
      .expect(201);
    expect(created.body.data.workspace.members[0].role).toBe("OWNER");
  });

  it("blocks viewer task creation through RBAC", async () => {
    const owner = await register("owner@test.dev", "Owner");
    const viewer = await register("viewer@test.dev", "Viewer");
    const workspace = await request(app).post("/api/workspaces").set("Authorization", `Bearer ${owner.accessToken}`).send({ name: "Engineering" });
    await request(app)
      .post(`/api/workspaces/${workspace.body.data.workspace.id}/members/invite`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: viewer.user.email, role: "VIEWER" })
      .expect(201);
    const project = await request(app)
      .post(`/api/workspaces/${workspace.body.data.workspace.id}/projects`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "API" })
      .expect(201);
    await request(app)
      .post(`/api/projects/${project.body.data.project.id}/tasks`)
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .send({ title: "Forbidden task" })
      .expect(403);
  });

  it("supports task CRUD and rejects assignment outside workspace", async () => {
    const owner = await register("owner@test.dev", "Owner");
    const outsider = await register("outsider@test.dev", "Outsider");
    const workspace = await request(app).post("/api/workspaces").set("Authorization", `Bearer ${owner.accessToken}`).send({ name: "Engineering" });
    const project = await request(app)
      .post(`/api/workspaces/${workspace.body.data.workspace.id}/projects`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "API" });

    await request(app)
      .post(`/api/projects/${project.body.data.project.id}/tasks`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "Bad assignment", assignedTo: outsider.user.id })
      .expect(422);

    const task = await request(app)
      .post(`/api/projects/${project.body.data.project.id}/tasks`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "Build endpoint", priority: "HIGH" })
      .expect(201);

    await request(app).get(`/api/tasks/${task.body.data.task.id}`).set("Authorization", `Bearer ${owner.accessToken}`).expect(200);
    await request(app)
      .patch(`/api/tasks/${task.body.data.task.id}/status`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "DONE" })
      .expect(200);
    await request(app).delete(`/api/tasks/${task.body.data.task.id}`).set("Authorization", `Bearer ${owner.accessToken}`).expect(200);
  });
});
