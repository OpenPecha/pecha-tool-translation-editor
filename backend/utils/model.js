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
          picture: true,
        },
      },
      roots: {
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "asc",
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
      Project: {
        connect: { id },
      },
      user: {
        connect: { id: userToAdd.id },
      },
      canRead: true,
      canWrite,
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
          // Now that docId is optional, we don't need to provide it for project-level permissions
          // Connect to the user instead of using userId directly
          user: {
            connect: { id: userId },
          },
          canRead: true,
          canWrite: true,
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
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      roots: {
        where: {
          isRoot: true,
        },
        include: {
          comments: true,
          footnotes: true,
          versions: true,
          permissions: true,
        },
      },
      permissions: {
        where: { userId: userId },
      },
    },
  });

  // Get translations for each root document separately
  if (project && project.roots) {
    for (let root of project.roots) {
      root.translations = await prisma.doc.findMany({
        where: { rootId: root.id },
        include: {
          comments: true,
          footnotes: true,
          versions: true,
          permissions: true,
        },
      });
    }
  }

  return project;
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
