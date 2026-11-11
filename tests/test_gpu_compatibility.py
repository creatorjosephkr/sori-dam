"""Exercise hardware decisions without importing the app's installation/startup side effects."""
import ast
from contextlib import nullcontext
from pathlib import Path
from types import SimpleNamespace
import subprocess
import unittest
from unittest.mock import Mock

SOURCE = ast.parse((Path(__file__).resolve().parents[1] / "app.py").read_text())


def load_function(name, **namespace):
    node = next(n for n in SOURCE.body if isinstance(n, ast.FunctionDef) and n.name == name)
    exec(compile(ast.Module(body=[node], type_ignores=[]), "app.py", "exec"), namespace)
    return namespace[name], namespace


class GPUCompatibilityTests(unittest.TestCase):
    def test_wheel_profiles(self):
        for output, expected in [
            ("12.0, 8192", ("2.7.1", "cu128")),
            ("8.9, 8192", ("2.5.1", "cu121")),
            ("6.1, 6144", ("2.5.1", "cu121")),
            ("12.0, 4096", ("2.5.1", "cu121")),
            ("N/A, N/A", ("2.5.1", "cu121")),
            ("", ("2.5.1", "cu121")),
        ]:
            with self.subTest(output=output):
                runner = Mock(return_value=SimpleNamespace(stdout=output, returncode=0))
                module = SimpleNamespace(run=runner, SubprocessError=subprocess.SubprocessError)
                fn, _ = load_function("windows_torch_profile", subprocess=module)
                self.assertEqual(fn(), expected)

    def test_missing_driver(self):
        module = SimpleNamespace(run=Mock(side_effect=FileNotFoundError), SubprocessError=subprocess.SubprocessError)
        fn, _ = load_function("windows_torch_profile", subprocess=module)
        self.assertEqual(fn(), ("2.5.1", "cu121"))

    def test_cuda_kernel_failure_is_cached(self):
        cuda = Mock()
        cuda.is_available.return_value = True
        cuda.get_device_properties.return_value = SimpleNamespace(major=12, total_memory=8 * 1024**3)
        torch = Mock(cuda=cuda)
        torch.inference_mode.return_value = nullcontext()
        torch.ones.side_effect = RuntimeError("no kernel image is available")
        fn, _ = load_function("can_use_cuda_for_voxcpm", torch=torch, _cuda_probe_result=None)
        self.assertFalse(fn())
        self.assertFalse(fn())
        self.assertEqual(torch.ones.call_count, 1)

    def test_cuda_success(self):
        cuda = Mock()
        cuda.is_available.return_value = True
        cuda.get_device_properties.return_value = SimpleNamespace(major=12, total_memory=8 * 1024**3)
        tensor = Mock()
        result = Mock()
        result.__getitem__ = Mock(return_value=SimpleNamespace(item=lambda: 32))
        tensor.__matmul__ = Mock(return_value=result)
        torch = Mock(cuda=cuda)
        torch.inference_mode.return_value = nullcontext()
        torch.ones.return_value = tensor
        fn, _ = load_function("can_use_cuda_for_voxcpm", torch=torch, _cuda_probe_result=None)
        self.assertTrue(fn())
        cuda.synchronize.assert_called_once_with(0)

    def test_low_vram_skips_probe(self):
        cuda = Mock()
        cuda.get_device_properties.return_value = SimpleNamespace(major=12, total_memory=4 * 1024**3)
        torch = Mock(cuda=cuda)
        torch.inference_mode.return_value = nullcontext()
        fn, _ = load_function("can_use_cuda_for_voxcpm", torch=torch, _cuda_probe_result=None)
        self.assertFalse(fn())
        torch.ones.assert_not_called()

    def test_cpu_fallback_display_overrides_detected_gpu(self):
        import os
        import platform
        torch = Mock()
        fn, _ = load_function("get_hardware_info", torch=torch, _model_device="cpu",
                              can_use_cuda_for_voxcpm=lambda: True,
                              os=os, platform=platform)
        self.assertEqual(fn()["device_type"], "cpu")


if __name__ == "__main__":
    unittest.main()
