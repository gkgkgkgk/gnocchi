"""A small database-backed check of the household's core recipe flow."""

import unittest

from httpx import ASGITransport, AsyncClient

from app.main import app


class RecipeFlowTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_recipe_edit_and_linked_variation(self):
        health = await self.client.get("/health")
        self.assertEqual(health.status_code, 200)

        created = await self.client.post("/recipes", json={
            "title": "Roasted carrots",
            "ingredients": [{"text": "carrots", "quantity": 0, "unit": ""}],
            "steps": ["Roast until tender"],
            "source_type": "manual",
        })
        self.assertEqual(created.status_code, 201, created.text)
        original = created.json()
        original_id = original["id"]

        try:
            edited = await self.client.patch(f"/recipes/{original_id}", json={"notes": "Use more cumin."})
            self.assertEqual(edited.status_code, 200, edited.text)
            self.assertEqual(edited.json()["ingredients"], original["ingredients"])
            self.assertEqual(edited.json()["steps"], original["steps"])

            variant = await self.client.post("/recipes", json={
                "title": "Spiced roasted carrots",
                "ingredients": original["ingredients"],
                "steps": ["Add cumin", "Roast until tender"],
                "source_type": "adapted",
                "source_recipe_id": original_id,
            })
            self.assertEqual(variant.status_code, 201, variant.text)
            variant_id = variant.json()["id"]
            try:
                self.assertEqual(variant.json()["source_recipe_id"], original_id)
                self.assertEqual((await self.client.get(f"/recipes/{original_id}")).json()["steps"], original["steps"])
                deleted = await self.client.delete(f"/recipes/{original_id}")
                self.assertEqual(deleted.status_code, 204, deleted.text)
                original_id = None
                self.assertIsNone((await self.client.get(f"/recipes/{variant_id}")).json()["source_recipe_id"])
            finally:
                await self.client.delete(f"/recipes/{variant_id}")
        finally:
            if original_id:
                await self.client.delete(f"/recipes/{original_id}")


if __name__ == "__main__":
    unittest.main()
