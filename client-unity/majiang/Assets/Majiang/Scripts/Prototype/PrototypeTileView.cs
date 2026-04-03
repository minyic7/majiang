using UnityEngine;

namespace Majiang.Prototype
{
    public sealed class PrototypeTileView : MonoBehaviour
    {
        private PrototypeGameController _controller;
        private int _handIndex;

        public void Bind(PrototypeGameController controller, int handIndex)
        {
            _controller = controller;
            _handIndex = handIndex;

            if (TryGetComponent<Collider>(out _))
            {
                return;
            }

            var box = gameObject.AddComponent<BoxCollider>();
            var renderers = GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0)
            {
                return;
            }

            var bounds = renderers[0].bounds;
            for (var i = 1; i < renderers.Length; i++)
            {
                bounds.Encapsulate(renderers[i].bounds);
            }

            box.center = transform.InverseTransformPoint(bounds.center);
            box.size = bounds.size;
        }

        private void OnMouseDown()
        {
            if (_controller != null)
            {
                _controller.TryDiscardLocalTile(_handIndex);
            }
        }
    }
}
