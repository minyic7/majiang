using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Majiang.Prototype
{
    public sealed class PrototypeGameController : MonoBehaviour
    {
        [Header("Scene References")]
        public Transform tableRoot;
        public Transform wallRoot;
        public Transform southHandRoot;
        public Transform westHandRoot;
        public Transform northHandRoot;
        public Transform eastHandRoot;
        public Transform southDiscardsRoot;
        public Transform westDiscardsRoot;
        public Transform northDiscardsRoot;
        public Transform eastDiscardsRoot;

        [Header("Layout")]
        public float localHandSpacing = 0.82f;
        public float localHandLift = 0.18f;
        public float localHandScale = 0.9f;
        public float discardSpacing = 0.72f;
        public float aiTurnDelaySeconds = 0.55f;

        private readonly List<PrototypeTileId>[] _hands =
        {
            new List<PrototypeTileId>(),
            new List<PrototypeTileId>(),
            new List<PrototypeTileId>(),
            new List<PrototypeTileId>(),
        };

        private readonly List<PrototypeTileId>[] _discards =
        {
            new List<PrototypeTileId>(),
            new List<PrototypeTileId>(),
            new List<PrototypeTileId>(),
            new List<PrototypeTileId>(),
        };

        private readonly List<GameObject> _spawnedVisuals = new List<GameObject>();
        private readonly List<PrototypeTileId> _wall = new List<PrototypeTileId>();

        private bool _awaitingLocalDiscard;
        private bool _roundFinished;
        private int _currentPlayer;
        private string _statusMessage = "Ready";

        private readonly Color _tableWood = new Color(0.29f, 0.18f, 0.14f, 1f);
        private readonly Color _tableFelt = new Color(0.18f, 0.42f, 0.29f, 1f);
        private readonly Color _aiTileColor = new Color(0.12f, 0.5f, 0.36f, 1f);

        private void Start()
        {
            EnsureSceneReferences();
            BuildTableIfMissing();
            StartPrototypeRound();
        }

        public void TryDiscardLocalTile(int handIndex)
        {
            if (!_awaitingLocalDiscard || _roundFinished)
            {
                return;
            }

            if (handIndex < 0 || handIndex >= _hands[0].Count)
            {
                return;
            }

            var tile = _hands[0][handIndex];
            _hands[0].RemoveAt(handIndex);
            _discards[0].Add(tile);
            _awaitingLocalDiscard = false;
            _statusMessage = "You discarded " + PrototypeTileCatalog.GetShortName(tile);
            RenderState();
            AdvanceTurn();
        }

        private void StartPrototypeRound()
        {
            StopAllCoroutines();
            ClearCollections();
            BuildWall();
            DealOpeningHands();
            _currentPlayer = 0;
            _roundFinished = false;
            _statusMessage = "Your turn: click a tile to discard";
            RenderState();
            StartCoroutine(RunLoop());
        }

        private IEnumerator RunLoop()
        {
            while (!_roundFinished)
            {
                if (_wall.Count == 0)
                {
                    _roundFinished = true;
                    _statusMessage = "Wall exhausted. Prototype round complete.";
                    RenderState();
                    yield break;
                }

                DrawTile(_currentPlayer);
                RenderState();

                if (_currentPlayer == 0)
                {
                    _awaitingLocalDiscard = true;
                    _statusMessage = "Your turn: click a tile to discard";
                    while (_awaitingLocalDiscard)
                    {
                        yield return null;
                    }
                }
                else
                {
                    _statusMessage = "AI " + (_currentPlayer + 1) + " is thinking...";
                    yield return new WaitForSeconds(aiTurnDelaySeconds);
                    DiscardRandomTile(_currentPlayer);
                    RenderState();
                    yield return new WaitForSeconds(0.2f);
                    AdvanceTurn();
                }
            }
        }

        private void AdvanceTurn()
        {
            _currentPlayer = (_currentPlayer + 1) % 4;
        }

        private void DiscardRandomTile(int playerIndex)
        {
            var hand = _hands[playerIndex];
            if (hand.Count == 0)
            {
                return;
            }

            var discardIndex = UnityEngine.Random.Range(0, hand.Count);
            var tile = hand[discardIndex];
            hand.RemoveAt(discardIndex);
            _discards[playerIndex].Add(tile);
            _statusMessage = "AI " + (playerIndex + 1) + " discarded " + PrototypeTileCatalog.GetShortName(tile);
        }

        private void DrawTile(int playerIndex)
        {
            if (_wall.Count == 0)
            {
                return;
            }

            var tile = _wall[_wall.Count - 1];
            _wall.RemoveAt(_wall.Count - 1);
            _hands[playerIndex].Add(tile);
            _hands[playerIndex].Sort();
        }

        private void DealOpeningHands()
        {
            for (var i = 0; i < 13; i++)
            {
                for (var playerIndex = 0; playerIndex < 4; playerIndex++)
                {
                    DrawTile(playerIndex);
                }
            }
        }

        private void BuildWall()
        {
            var values = (PrototypeTileId[])Enum.GetValues(typeof(PrototypeTileId));
            for (var copy = 0; copy < 4; copy++)
            {
                foreach (var tileId in values)
                {
                    _wall.Add(tileId);
                }
            }

            for (var i = _wall.Count - 1; i > 0; i--)
            {
                var swapIndex = UnityEngine.Random.Range(0, i + 1);
                var temp = _wall[i];
                _wall[i] = _wall[swapIndex];
                _wall[swapIndex] = temp;
            }
        }

        private void ClearCollections()
        {
            foreach (var hand in _hands)
            {
                hand.Clear();
            }

            foreach (var discard in _discards)
            {
                discard.Clear();
            }

            _wall.Clear();

            foreach (var visual in _spawnedVisuals)
            {
                if (visual != null)
                {
                    Destroy(visual);
                }
            }

            _spawnedVisuals.Clear();
        }

        private void RenderState()
        {
            foreach (var visual in _spawnedVisuals)
            {
                if (visual != null)
                {
                    Destroy(visual);
                }
            }

            _spawnedVisuals.Clear();

            RenderLocalHand();
            RenderAiHand(westHandRoot, 1, new Vector3(-3.7f, 0.3f, 0f), new Vector3(0f, -90f, 90f));
            RenderAiHand(northHandRoot, 2, new Vector3(0f, 0.3f, 3.5f), new Vector3(0f, 180f, 90f));
            RenderAiHand(eastHandRoot, 3, new Vector3(3.7f, 0.3f, 0f), new Vector3(0f, 90f, 90f));

            RenderDiscards(southDiscardsRoot, 0, new Vector3(0f, 0.15f, -0.8f), Vector3.zero);
            RenderDiscards(westDiscardsRoot, 1, new Vector3(-1.7f, 0.15f, 0.5f), new Vector3(0f, 90f, 0f));
            RenderDiscards(northDiscardsRoot, 2, new Vector3(0f, 0.15f, 1.6f), new Vector3(0f, 180f, 0f));
            RenderDiscards(eastDiscardsRoot, 3, new Vector3(1.7f, 0.15f, 0.5f), new Vector3(0f, -90f, 0f));

            RenderWallCounter();
        }

        private void RenderLocalHand()
        {
            if (southHandRoot == null)
            {
                return;
            }

            var hand = _hands[0];
            var totalWidth = (hand.Count - 1) * localHandSpacing;
            var startX = -totalWidth * 0.5f;

            for (var i = 0; i < hand.Count; i++)
            {
                var prefab = PrototypeTileCatalog.LoadPrefab(hand[i]);
                if (prefab == null)
                {
                    continue;
                }

                var tile = Instantiate(prefab, southHandRoot);
                tile.transform.localPosition = new Vector3(startX + (i * localHandSpacing), localHandLift, 0f);
                tile.transform.localRotation = Quaternion.identity;
                tile.transform.localScale = Vector3.one * localHandScale;

                var view = tile.AddComponent<PrototypeTileView>();
                view.Bind(this, i);
                _spawnedVisuals.Add(tile);
            }
        }

        private void RenderAiHand(Transform root, int playerIndex, Vector3 center, Vector3 eulerRotation)
        {
            if (root == null)
            {
                return;
            }

            var handCount = _hands[playerIndex].Count;
            var totalWidth = Mathf.Max(0f, (handCount - 1) * 0.38f);
            var start = -totalWidth * 0.5f;

            for (var i = 0; i < handCount; i++)
            {
                var tile = GameObject.CreatePrimitive(PrimitiveType.Cube);
                tile.name = "AI" + (playerIndex + 1) + "Tile" + (i + 1);
                tile.transform.SetParent(root, false);
                tile.transform.localPosition = center + new Vector3(start + (i * 0.38f), 0.38f, 0f);
                tile.transform.localRotation = Quaternion.Euler(eulerRotation);
                tile.transform.localScale = new Vector3(0.34f, 0.54f, 0.22f);

                var renderer = tile.GetComponent<Renderer>();
                renderer.material.color = _aiTileColor;
                _spawnedVisuals.Add(tile);
            }
        }

        private void RenderDiscards(Transform root, int playerIndex, Vector3 center, Vector3 eulerRotation)
        {
            if (root == null)
            {
                return;
            }

            var discards = _discards[playerIndex];
            const int columns = 6;
            for (var i = 0; i < discards.Count; i++)
            {
                var prefab = PrototypeTileCatalog.LoadPrefab(discards[i]);
                if (prefab == null)
                {
                    continue;
                }

                var tile = Instantiate(prefab, root);
                var row = i / columns;
                var column = i % columns;
                tile.transform.localPosition = center + new Vector3(
                    (column - ((columns - 1) * 0.5f)) * discardSpacing,
                    0.02f,
                    row * 0.58f);
                tile.transform.localRotation = Quaternion.Euler(eulerRotation);
                tile.transform.localScale = Vector3.one * 0.72f;
                _spawnedVisuals.Add(tile);
            }
        }

        private void RenderWallCounter()
        {
            if (wallRoot == null)
            {
                return;
            }

            var blocks = Mathf.Clamp(Mathf.CeilToInt(_wall.Count / 8f), 0, 18);
            for (var i = 0; i < blocks; i++)
            {
                var block = GameObject.CreatePrimitive(PrimitiveType.Cube);
                block.name = "WallBlock" + (i + 1);
                block.transform.SetParent(wallRoot, false);
                block.transform.localPosition = new Vector3(-2.8f + (i * 0.33f), 0.28f, -2.65f);
                block.transform.localScale = new Vector3(0.26f, 0.45f, 0.18f);
                block.GetComponent<Renderer>().material.color = new Color(0.86f, 0.83f, 0.76f, 1f);
                _spawnedVisuals.Add(block);
            }
        }

        private void EnsureSceneReferences()
        {
            if (tableRoot == null) tableRoot = transform.Find("TableRoot");
            if (wallRoot == null) wallRoot = transform.Find("WallRoot");
            if (southHandRoot == null) southHandRoot = transform.Find("Players/PlayerSouth");
            if (westHandRoot == null) westHandRoot = transform.Find("Players/PlayerWest");
            if (northHandRoot == null) northHandRoot = transform.Find("Players/PlayerNorth");
            if (eastHandRoot == null) eastHandRoot = transform.Find("Players/PlayerEast");
            if (southDiscardsRoot == null) southDiscardsRoot = transform.Find("Discards/South");
            if (westDiscardsRoot == null) westDiscardsRoot = transform.Find("Discards/West");
            if (northDiscardsRoot == null) northDiscardsRoot = transform.Find("Discards/North");
            if (eastDiscardsRoot == null) eastDiscardsRoot = transform.Find("Discards/East");
        }

        private void BuildTableIfMissing()
        {
            if (tableRoot != null)
            {
                if (tableRoot.Find("TableBase") == null)
                {
                    CreateTableGeometry();
                }
                return;
            }

            tableRoot = new GameObject("TableRoot").transform;
            tableRoot.SetParent(transform, false);

            var players = new GameObject("Players").transform;
            players.SetParent(transform, false);
            southHandRoot = new GameObject("PlayerSouth").transform;
            westHandRoot = new GameObject("PlayerWest").transform;
            northHandRoot = new GameObject("PlayerNorth").transform;
            eastHandRoot = new GameObject("PlayerEast").transform;
            southHandRoot.SetParent(players, false);
            westHandRoot.SetParent(players, false);
            northHandRoot.SetParent(players, false);
            eastHandRoot.SetParent(players, false);

            var discards = new GameObject("Discards").transform;
            discards.SetParent(transform, false);
            southDiscardsRoot = new GameObject("South").transform;
            westDiscardsRoot = new GameObject("West").transform;
            northDiscardsRoot = new GameObject("North").transform;
            eastDiscardsRoot = new GameObject("East").transform;
            southDiscardsRoot.SetParent(discards, false);
            westDiscardsRoot.SetParent(discards, false);
            northDiscardsRoot.SetParent(discards, false);
            eastDiscardsRoot.SetParent(discards, false);

            wallRoot = new GameObject("WallRoot").transform;
            wallRoot.SetParent(transform, false);

            CreateTableGeometry();
        }

        private void CreateTableGeometry()
        {
            if (tableRoot == null)
            {
                return;
            }

            var baseBlock = GameObject.CreatePrimitive(PrimitiveType.Cube);
            baseBlock.name = "TableBase";
            baseBlock.transform.SetParent(tableRoot, false);
            baseBlock.transform.localPosition = new Vector3(0f, -0.35f, 0f);
            baseBlock.transform.localScale = new Vector3(8f, 0.7f, 8f);
            baseBlock.GetComponent<Renderer>().material.color = _tableWood;

            var felt = GameObject.CreatePrimitive(PrimitiveType.Cube);
            felt.name = "TableFelt";
            felt.transform.SetParent(tableRoot, false);
            felt.transform.localPosition = new Vector3(0f, 0.02f, 0f);
            felt.transform.localScale = new Vector3(7.1f, 0.08f, 7.1f);
            felt.GetComponent<Renderer>().material.color = _tableFelt;

            CreateRail("NorthRail", new Vector3(0f, 0.2f, 3.6f), new Vector3(7.5f, 0.25f, 0.35f));
            CreateRail("SouthRail", new Vector3(0f, 0.2f, -3.6f), new Vector3(7.5f, 0.25f, 0.35f));
            CreateRail("WestRail", new Vector3(-3.6f, 0.2f, 0f), new Vector3(0.35f, 0.25f, 7.5f));
            CreateRail("EastRail", new Vector3(3.6f, 0.2f, 0f), new Vector3(0.35f, 0.25f, 7.5f));
        }

        private void CreateRail(string railName, Vector3 localPosition, Vector3 localScale)
        {
            if (tableRoot == null)
            {
                return;
            }

            var rail = GameObject.CreatePrimitive(PrimitiveType.Cube);
            rail.name = railName;
            rail.transform.SetParent(tableRoot, false);
            rail.transform.localPosition = localPosition;
            rail.transform.localScale = localScale;
            rail.GetComponent<Renderer>().material.color = new Color(0.36f, 0.23f, 0.16f, 1f);
        }

        private void OnGUI()
        {
            var panelRect = new Rect(16f, 16f, 280f, 140f);
            GUI.Box(panelRect, "Prototype Round");
            GUI.Label(new Rect(28f, 48f, 220f, 24f), "Current Turn: Seat " + (_currentPlayer + 1));
            GUI.Label(new Rect(28f, 72f, 220f, 24f), "Wall Remaining: " + _wall.Count);
            GUI.Label(new Rect(28f, 96f, 420f, 24f), _statusMessage);

            if (GUI.Button(new Rect(28f, 124f, 120f, 28f), "Restart Round"))
            {
                StartPrototypeRound();
            }
        }
    }
}
