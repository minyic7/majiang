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
            camera.transform.position = new Vector3(0f, 6.4f, -5.8f);
            camera.transform.rotation = Quaternion.Euler(48f, 0f, 0f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.12f, 0.21f, 0.35f, 1f);

            var additionalCameraData = cameraObject.AddComponent<UniversalAdditionalCameraData>();
            additionalCameraData.renderPostProcessing = false;

            var lightObject = new GameObject("Directional Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.945f, 0.84f, 1f);
            light.intensity = 1.45f;
            light.shadows = LightShadows.None;
            lightObject.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            lightObject.AddComponent<UniversalAdditionalLightData>();

            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.80f, 0.84f, 0.90f, 1f);

            var controllerObject = new GameObject("GameController");
            var controller = controllerObject.AddComponent<PrototypeGameController>();

            controller.tableRoot = new GameObject("TableRoot").transform;
            controller.tableRoot.SetParent(controllerObject.transform, false);

            controller.wallRoot = new GameObject("WallRoot").transform;
            controller.wallRoot.SetParent(controllerObject.transform, false);

            var playersRoot = new GameObject("Players").transform;
            playersRoot.SetParent(controllerObject.transform, false);
            controller.southHandRoot = new GameObject("PlayerSouth").transform;
            controller.southHandRoot.SetParent(playersRoot, false);
            controller.westHandRoot = new GameObject("PlayerWest").transform;
            controller.westHandRoot.SetParent(playersRoot, false);
            controller.northHandRoot = new GameObject("PlayerNorth").transform;
            controller.northHandRoot.SetParent(playersRoot, false);
            controller.eastHandRoot = new GameObject("PlayerEast").transform;
            controller.eastHandRoot.SetParent(playersRoot, false);

            var discardsRoot = new GameObject("Discards").transform;
            discardsRoot.SetParent(controllerObject.transform, false);
            controller.southDiscardsRoot = new GameObject("South").transform;
            controller.southDiscardsRoot.SetParent(discardsRoot, false);
            controller.westDiscardsRoot = new GameObject("West").transform;
            controller.westDiscardsRoot.SetParent(discardsRoot, false);
            controller.northDiscardsRoot = new GameObject("North").transform;
            controller.northDiscardsRoot.SetParent(discardsRoot, false);
            controller.eastDiscardsRoot = new GameObject("East").transform;
            controller.eastDiscardsRoot.SetParent(discardsRoot, false);

            EditorSceneManager.MarkSceneDirty(scene);
            const string scenePath = "Assets/Scenes/GamePrototype.unity";
            EditorSceneManager.SaveScene(scene, scenePath);
            AssetDatabase.Refresh();
            EditorUtility.DisplayDialog(
                "Prototype Scene Created",
                "GamePrototype.unity has been created under Assets/Scenes. Open it and press Play.",
                "OK");
        }
    }
}
