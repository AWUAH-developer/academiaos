import { Router } from "express";
import path from "path";

const router = Router();

router.get("/download/desktop-src", (_req, res) => {
  const file = path.resolve(__dirname, "../../desktop-src.zip");
  res.download(file, "academia-os-desktop.zip");
});

export default router;
