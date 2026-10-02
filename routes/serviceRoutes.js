const express = require("express");
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const router = express.Router();

router.route("/").get(getServices).post(createService);
router
  .route("/:id")
  .get(getServiceById)
  .put(updateService)
  .delete(deleteService);

module.exports = router;
