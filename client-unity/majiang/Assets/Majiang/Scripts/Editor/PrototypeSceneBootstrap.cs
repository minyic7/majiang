using Majiang.Prototype;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Majiang.Editor
{
    public static class PrototypeSceneBootstrap
    {
        [MenuItem("Tools/Majiang/Create Prototype Scene")]
        public static void CreatePrototypeScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var cameraObject = new GameObject("Main Camera");
            var camera = cameraObject.AddComponent<Camera>();
            cameraObject.tag = "MainCamera";
            camera.transform.position = new Vector3(0f, 1.1f, -0.82f);
            camera.transform.rotation = Quaternion.Euler(58f, 0f, 0f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.12f, 0.21f, 0.35f, 1f);

            var additionalCameraData = cameraObject.AddComponent<UniversalAdditionalCameraData>();
            additionalCameraData.renderPostProcessing = false;

            var lightObject = new GameObject("Directional Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.95f, 0.88f, 1f);
            light.intensity = 0.8f;
            light.shadows = LightShadows.None;
            lightObject.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            lightObject.AddComponent<UniversalAdditionalLightData>();

            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.42f, 0.46f, 0.50f, 1f);

            CreateLayoutGrid();

            var wallsRoot = new GameObject("TileWalls").transform;

            var controllerObject = new GameObject("WallGenerator");
            var controller = controllerObject.AddComponent<PrototypeGameController>();
            controller.wallRoot = wallsRoot;
            controller.GenerateStaticWalls();
            Object.DestroyImmediate(controllerObject);

            EditorSceneManager.MarkSceneDirty(scene);
            const string scenePath = "Assets/Scenes/GamePrototype.unity";
            EditorSceneManager.SaveScene(scene, scenePath);
            AssetDatabase.Refresh();
            EditorUtility.DisplayDialog(
                "Prototype Scene Created",
                "GamePrototype.unity has been created under Assets/Scenes with static tile walls.",
                "OK");
        }

        private static void CreateLayoutGrid()
        {
            var gridRoot = new GameObject("LayoutGrid").transform;
            var minorMaterial = CreateGridMaterial(new Color(0.28f, 0.30f, 0.32f, 1f));
            var majorMaterial = CreateGridMaterial(new Color(0.18f, 0.20f, 0.22f, 1f));

            const float extent = 0.45f;
            const float minorStep = 0.02f;
            const float majorStep = 0.10f;
            const float y = 0.001f;
            const float minorThickness = 0.0015f;
            const float majorThickness = 0.0035f;

            for (var value = -extent; value <= extent + 0.0001f; value += minorStep)
            {
                var isMajor = Mathf.Abs(Mathf.Round(value / majorStep) * majorStep - value) < 0.0001f;
                var thickness = isMajor ? majorThickness : minorThickness;
                var material = isMajor ? majorMaterial : minorMaterial;

                CreateGridLine(
                    gridRoot,
                    "GridX_" + value.ToString("F2"),
                    new Vector3(value, y, 0f),
                    new Vector3(thickness, thickness, extent * 2f),
                    material);

                CreateGridLine(
                    gridRoot,
                    "GridZ_" + value.ToString("F2"),
                    new Vector3(0f, y, value),
                    new Vector3(extent * 2f, thickness, thickness),
                    material);
            }
        }

        private static Material CreateGridMaterial(Color color)
        {
            var material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            material.name = "LayoutGridMaterial";
            material.color = color;
            material.hideFlags = HideFlags.HideAndDontSave;
            return material;
        }

        private static void CreateGridLine(Transform root, string name, Vector3 position, Vector3 scale, Material material)
        {
            var line = GameObject.CreatePrimitive(PrimitiveType.Cube);
            line.name = name;
            line.transform.SetParent(root, false);
            line.transform.localPosition = position;
            line.transform.localRotation = Quaternion.identity;
            line.transform.localScale = scale;
            line.GetComponent<Renderer>().sharedMaterial = material;
        }
    }
}
