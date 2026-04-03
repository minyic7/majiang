using System.Collections.Generic;
using UnityEngine;

namespace Majiang.Prototype
{
    public sealed class PrototypeGameController : MonoBehaviour
    {
        [Header("Scene References")]
        public Transform wallRoot;

        public float framePaddingMeters = 0.012f;

        [Header("Tile Dimensions (Meters)")]
        public float tileLengthMeters = 0.028f;
        public float tileWidthMeters = 0.02f;
        public float tileThicknessMeters = 0.012f;
        public float wallHorizontalScaleMultiplier = 1f;

        private readonly List<GameObject> _spawnedVisuals = new List<GameObject>();

        private float _tileWidthTarget;
        private float _tileHeightTarget;
        private float _tileDepthTarget;
        private float _tileScale;
        private float _innerMinX;
        private float _innerMaxX;
        private float _innerMinZ;
        private float _innerMaxZ;
        private Vector3 _southWallTileSize;
        private Vector3 _westWallTileSize;
        private Vector3 _wallTileScale;

        public void GenerateStaticWalls()
        {
            EnsureSceneReferences();
            CalculateGeometry();
            RenderInitialWalls();
        }

        private void CalculateGeometry()
        {
            var blankPrefab = PrototypeTileCatalog.LoadPrefab(PrototypeTileId.DragonBlank);
            if (blankPrefab == null)
            {
                Debug.LogError("Could not load Dragon_Blank prefab.");
                return;
            }

            var sourceBounds = MeasureSourceBounds(blankPrefab);
            var dims = new List<float> { sourceBounds.x, sourceBounds.y, sourceBounds.z };
            dims.Sort();

            var sourceDepth = dims[0];
            var sourceWidth = dims[1];
            var sourceHeight = dims[2];

            _tileWidthTarget = tileWidthMeters;
            _tileHeightTarget = tileLengthMeters;
            _tileDepthTarget = tileThicknessMeters;

            var scaleByWidth = _tileWidthTarget / sourceWidth;
            var scaleByHeight = _tileHeightTarget / sourceHeight;
            var scaleByDepth = _tileDepthTarget / sourceDepth;
            _tileScale = Mathf.Min(scaleByWidth, scaleByHeight, scaleByDepth);
            _wallTileScale = new Vector3(
                _tileScale * wallHorizontalScaleMultiplier,
                _tileScale,
                _tileScale * wallHorizontalScaleMultiplier);

            _southWallTileSize = MeasureOrientedTileSize(blankPrefab, Quaternion.Euler(180f, 0f, 0f), _wallTileScale);
            _westWallTileSize = MeasureOrientedTileSize(blankPrefab, Quaternion.Euler(180f, 90f, 0f), _wallTileScale);

            var longWallRun = _southWallTileSize.x * 14f;
            var frameSide = longWallRun + (framePaddingMeters * 2f);
            var frameHalfSide = frameSide * 0.5f;
            _innerMinX = -frameHalfSide;
            _innerMaxX = frameHalfSide;
            _innerMinZ = -frameHalfSide;
            _innerMaxZ = frameHalfSide;
        }

        private void RenderInitialWalls()
        {
            ClearSpawnedVisuals();

            const int northSouthStacks = 14;
            const int eastWestStacks = 13;
            var southStep = _southWallTileSize.x;
            var westStep = _westWallTileSize.z;

            RenderWall(
                "SouthWall",
                northSouthStacks,
                new Vector3(0f, 0f, _innerMinZ),
                Quaternion.Euler(180f, 0f, 0f),
                Vector3.right,
                _innerMaxX - (_southWallTileSize.x * 0.5f),
                -southStep,
                _southWallTileSize);

            RenderWall(
                "NorthWall",
                northSouthStacks,
                new Vector3(0f, 0f, _innerMaxZ),
                Quaternion.Euler(180f, 180f, 0f),
                Vector3.right,
                _innerMinX + (_southWallTileSize.x * 0.5f),
                southStep,
                _southWallTileSize);

            RenderWall(
                "WestWall",
                eastWestStacks,
                new Vector3(_innerMinX, 0f, 0f),
                Quaternion.Euler(180f, 90f, 0f),
                Vector3.forward,
                _innerMinZ + (_westWallTileSize.z * 0.5f),
                westStep,
                _westWallTileSize);

            RenderWall(
                "EastWall",
                eastWestStacks,
                new Vector3(_innerMaxX, 0f, 0f),
                Quaternion.Euler(180f, -90f, 0f),
                Vector3.forward,
                _innerMaxZ - (_westWallTileSize.z * 0.5f),
                -westStep,
                _westWallTileSize);
        }

        private void RenderWall(
            string wallName,
            int stacks,
            Vector3 center,
            Quaternion rotation,
            Vector3 axis,
            float startOffset,
            float step,
            Vector3 tileSize)
        {
            var root = CreateOrGetChild(wallRoot, wallName);
            var blankPrefab = PrototypeTileCatalog.LoadPrefab(PrototypeTileId.DragonBlank);
            if (blankPrefab == null)
            {
                return;
            }

            var up = tileSize.y;

            for (var stackIndex = 0; stackIndex < stacks; stackIndex++)
            {
                for (var level = 0; level < 2; level++)
                {
                    var tile = Instantiate(blankPrefab, root);
                    tile.name = wallName + "_Stack_" + stackIndex + "_Tile_" + level;

                    var offset = startOffset + (stackIndex * step);
                    var position = center + (axis * offset) + new Vector3(0f, (up * 0.5f) + (level * up), 0f);

                    tile.transform.localPosition = position;
                    tile.transform.localRotation = rotation;
                    tile.transform.localScale = _wallTileScale;
                    _spawnedVisuals.Add(tile);
                }
            }
        }

        private Vector3 MeasureSourceBounds(GameObject prefab)
        {
            var sample = Instantiate(prefab);
            sample.hideFlags = HideFlags.HideAndDontSave;
            sample.transform.position = new Vector3(1000f, 1000f, 1000f);
            sample.transform.rotation = Quaternion.identity;
            sample.transform.localScale = Vector3.one;

            var bounds = CollectBounds(sample);
            var size = bounds.size;
            DestroyImmediate(sample);
            return size;
        }

        private Vector3 MeasureOrientedTileSize(GameObject prefab, Quaternion rotation, Vector3 scale)
        {
            var sample = Instantiate(prefab);
            sample.hideFlags = HideFlags.HideAndDontSave;
            sample.transform.position = new Vector3(1000f, 1000f, 1000f);
            sample.transform.rotation = rotation;
            sample.transform.localScale = scale;

            var bounds = CollectBounds(sample);
            var size = bounds.size;
            DestroyImmediate(sample);
            return size;
        }

        private Bounds CollectBounds(GameObject root)
        {
            var renderers = root.GetComponentsInChildren<Renderer>();
            var bounds = renderers[0].bounds;
            for (var i = 1; i < renderers.Length; i++)
            {
                bounds.Encapsulate(renderers[i].bounds);
            }

            return bounds;
        }

        private Transform CreateOrGetChild(Transform parent, string childName)
        {
            var existing = parent.Find(childName);
            if (existing != null)
            {
                return existing;
            }

            var child = new GameObject(childName).transform;
            child.SetParent(parent, false);
            return child;
        }

        private void ClearSpawnedVisuals()
        {
            foreach (var visual in _spawnedVisuals)
            {
                if (visual != null)
                {
                    Destroy(visual);
                }
            }

            _spawnedVisuals.Clear();

            if (wallRoot == null)
            {
                return;
            }

            for (var i = wallRoot.childCount - 1; i >= 0; i--)
            {
                Destroy(wallRoot.GetChild(i).gameObject);
            }
        }

        private void EnsureSceneReferences()
        {
            if (wallRoot == null) wallRoot = transform.Find("WallRoot");
        }
    }
}
