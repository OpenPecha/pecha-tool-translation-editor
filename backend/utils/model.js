const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getProject(id) {
  return await prisma.project.findUnique({
    where: { id },
  });
}

async function getProjects(whereClause, skip, limit) {
  return await prisma.project.findMany({
    where: whereClause,
    include: {
      owner: {
        select: {
          id: true,
          username: true,
        },
      },
      roots: {
        select: {
          id: true,
          name: true,
          updatedAt: true,
          translations: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    skip,
    take: limit,
    orderBy: { updatedAt: "desc" },
  });
}

async function getProjectsCount(whereClause) {
  return await prisma.project.count({ where: whereClause });
}

async function getProjectById(id) {
  return await prisma.project.findUnique({
    where: { id },
    include: {
      permissions: true,
    },
  });
}

async function getUserByEmail(email) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

async function updatePermission(existingPermission, canWrite) {
  return await prisma.permission.update({
    where: { id: existingPermission.id },
    data: { canWrite },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });
}

async function createPermission(id, userToAdd, canWrite) {
  return await prisma.permission.create({
    data: {
      projectId: id,
      userId: userToAdd.id,
      canRead: true,
      canWrite,
      accessLevel: canWrite ? "editor" : "viewer",
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });
}

async function createProject(name, identifier, metadata, rootId, userId) {
  return await prisma.project.create({
    data: {
      name,
      identifier: identifier + "_" + Date.now(),
      ownerId: userId,
      metadata,
      roots: rootId
        ? {
            connect: { id: rootId },
          }
        : undefined,
      permissions: {
        create: {
          // Project-level permission for the owner
          userId: userId,
          projectId: undefined, // Will be set automatically by Prisma
          canRead: true,
          canWrite: true,
          accessLevel: "admin", // Owner gets admin access
        },
      },
    },
  });
}

async function getProjectWithPermissions(id) {
  return await prisma.project.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      permissions: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

async function getPermission(id, userId) {
  return await prisma.permission.findFirst({
    where: {
      projectId: id,
      userId,
    },
  });
}

async function deletePermission(permission) {
  return await prisma.permission.delete({
    where: { id: permission.id },
  });
}

async function updateProject(id, name, identifier, metadata, status) {
  return await prisma.project.update({
    where: { id },
    data: {
      name,
      identifier,
      metadata,
      status,
    },
  });
}

async function deleteProject(id) {
  return await prisma.project.update({
    where: { id },
    data: { status: "deleted" },
  });
}

async function getProjectWithDocuments(id, userId) {
  return await prisma.project.findUnique({
    where: { id },
    include: {
      roots: {
        include: {
          translations: true,
        },
      },
      permissions: {
        where: { userId: userId },
      },
    },
  });
}
module.exports = {
  createProject,
  getProject,
  getProjects,
  getProjectsCount,
  getProjectById,
  getProjectWithDocuments,
  getUserByEmail,
  updatePermission,
  createPermission,
  getProjectWithPermissions,
  getPermission,
  deletePermission,
  updateProject,
  deleteProject,
};
