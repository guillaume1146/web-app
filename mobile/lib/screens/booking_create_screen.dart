import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/time_slot_picker.dart';

/// Creates a booking for any provider + service. Works for every provider role
/// (dynamic-roles principle) — no hardcoded booking types.
class BookingCreateScreen extends ConsumerStatefulWidget {
  final String providerId;
  final String? serviceId;
  const BookingCreateScreen({super.key, required this.providerId, this.serviceId});

  @override
  ConsumerState<BookingCreateScreen> createState() => _BookingCreateScreenState();
}

class _BookingCreateScreenState extends ConsumerState<BookingCreateScreen> {
  Map<String, dynamic>? _provider;
  List<Map<String, dynamic>> _services = [];
  String? _selectedServiceId;
  DateTime? _scheduledAt;
  String _mode = 'in-person';
  final _reason = TextEditingController();
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedServiceId = widget.serviceId;
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/providers/${widget.providerId}'),
        ApiClient.instance.get('/providers/${widget.providerId}/services'),
      ]);
      final profile = (results[0].data as Map?)?['data'] as Map?;
      final services = (results[1].data as Map?)?['data'] as List?;
      setState(() {
        _provider = profile == null ? null : Map<String, dynamic>.from(profile);
        _services = services?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _selectedServiceId ??= _services.isNotEmpty ? _services.first['id']?.toString() : null;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if (_selectedServiceId == null) {
      setState(() => _error = 'Pick a service');
      return;
    }
    if (_scheduledAt == null) {
      setState(() => _error = 'Pick a date & time');
      return;
    }
    setState(() { _submitting = true; _error = null; });
    try {
      final dt = _scheduledAt!;
      final selectedService = _services.firstWhere(
        (s) => s['id']?.toString() == _selectedServiceId,
        orElse: () => <String, dynamic>{},
      );
      final body = <String, dynamic>{
        'providerUserId': widget.providerId,
        'providerType': _provider?['userType'],
        // Backend DTO expects split date + time
        'scheduledDate': '${dt.year.toString().padLeft(4, '0')}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}',
        'scheduledTime': '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}',
        'type': _mode == 'home-visit' ? 'home_visit' : _mode,
        'reason': _reason.text.trim(),
        if (selectedService['name'] != null) 'serviceName': selectedService['name'],
        if (selectedService['priceOverride'] != null || selectedService['defaultPrice'] != null)
          'servicePrice': (selectedService['priceOverride'] ?? selectedService['defaultPrice']) as num,
      };
      final res = await ApiClient.instance.post('/bookings', data: body);
      final data = res.data as Map?;
      if (data?['success'] == true) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking created'), backgroundColor: Colors.green),
        );
        context.go('/bookings');
      } else {
        setState(() => _error = data?['message']?.toString() ?? 'Booking failed');
      }
    } catch (e) {
      setState(() => _error = 'Network error');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Book')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _provider == null
              ? const Center(child: Text('Provider not found'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Provider header
                    Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundImage: _provider!['profileImage'] != null
                              ? NetworkImage(_provider!['profileImage'].toString())
                              : null,
                          child: _provider!['profileImage'] == null ? const Icon(Icons.person) : null,
                        ),
                        title: Text(_provider!['name']?.toString() ?? ''),
                        subtitle: Text(_provider!['userType']?.toString().replaceAll('_', ' ') ?? ''),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedServiceId,
                      decoration: const InputDecoration(labelText: 'Service', border: OutlineInputBorder()),
                      items: _services.map((s) {
                        final price = (s['priceOverride'] ?? s['defaultPrice'] ?? 0) as num;
                        return DropdownMenuItem(
                          value: s['id']?.toString(),
                          child: Text('${s['name'] ?? s['serviceName'] ?? 'Service'} — $price MUR'),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedServiceId = v),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _mode,
                      decoration: const InputDecoration(labelText: 'Mode', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'in-person', child: Text('In person')),
                        DropdownMenuItem(value: 'video', child: Text('Video call')),
                        DropdownMenuItem(value: 'home-visit', child: Text('Home visit')),
                      ],
                      onChanged: (v) => setState(() => _mode = v ?? 'in-person'),
                    ),
                    const SizedBox(height: 16),
                    const Padding(
                      padding: EdgeInsets.only(bottom: 6, left: 4),
                      child: Text('Pick a time slot', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 14)),
                    ),
                    TimeSlotPicker(
                      providerUserId: widget.providerId,
                      onSelected: (dt) => setState(() => _scheduledAt = dt),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _reason,
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'Reason (optional)', border: OutlineInputBorder()),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                    ],
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal, padding: const EdgeInsets.symmetric(vertical: 16)),
                      child: _submitting
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Confirm booking', style: TextStyle(fontSize: 16)),
                    ),
                  ],
                ),
    );
  }
}
