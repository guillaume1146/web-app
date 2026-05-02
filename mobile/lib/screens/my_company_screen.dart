import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/company_analytics_card.dart';
import '../widgets/company_danger_zone.dart';

/// Any user may own a company now that CORPORATE_ADMIN is a capability.
/// Companies may optionally be flagged as insurance schemes — members then
/// pay a fixed monthly contribution collected from their wallet.
class MyCompanyScreen extends ConsumerStatefulWidget {
  const MyCompanyScreen({super.key});
  @override
  ConsumerState<MyCompanyScreen> createState() => _MyCompanyScreenState();
}

class _MyCompanyScreenState extends ConsumerState<MyCompanyScreen> {
  Map<String, dynamic>? _company;
  Map<String, dynamic>? _stats;
  List<Map<String, dynamic>> _members = [];
  List<Map<String, dynamic>> _corporatePlans = [];

  // Insurance owner view
  Map<String, dynamic>? _insuranceData;

  bool _loading = true;

  // Create-company form
  final _companyName = TextEditingController();
  final _industry = TextEditingController();
  final _regNumber = TextEditingController();
  final _employeeCount = TextEditingController(text: '10');
  String? _selectedPlanId;
  bool _isInsurance = false;
  final _monthlyContribution = TextEditingController(text: '500');
  final _coverageDescription = TextEditingController();
  bool _savingCompany = false;

  final _inviteEmail = TextEditingController();
  bool _inviting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    setState(() => _loading = true);
    try {
      // Corporate plans — curated list (type=corporate) for plan picker.
      final plansRes = await ApiClient.instance.get('/subscriptions', queryParameters: {'type': 'corporate'});
      final plansData = (plansRes.data as Map?)?['data'] as List?;
      _corporatePlans = plansData?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];

      // Dashboard — existing company (if any).
      final dashRes = await ApiClient.instance.get('/corporate/${user['id']}/dashboard');
      final data = (dashRes.data as Map?)?['data'] as Map?;
      if (data != null) {
        _company = data['company'] is Map ? Map<String, dynamic>.from(data['company'] as Map) : null;
        _stats = data['stats'] is Map ? Map<String, dynamic>.from(data['stats'] as Map) : null;
      }
      if (_company != null) {
        final mRes = await ApiClient.instance.get('/corporate/${user['id']}/members');
        final mData = (mRes.data as Map?)?['data'] as List?;
        _members = mData?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];

        // If this company is flagged as insurance, pull the members-status table.
        if (_company?['isInsuranceCompany'] == true) {
          try {
            final insRes = await ApiClient.instance.get('/corporate/insurance/members');
            final insData = (insRes.data as Map?)?['data'] as Map?;
            if (insData != null) {
              _insuranceData = Map<String, dynamic>.from(insData);
            }
          } catch (_) { /* not an insurance owner — silent */ }
        }
      }
    } catch (_) { /* swallow */ }
    finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _createCompany() async {
    if (_companyName.text.trim().isEmpty) return;
    setState(() => _savingCompany = true);
    try {
      final body = <String, dynamic>{
        'companyName': _companyName.text.trim(),
        'industry': _industry.text.trim(),
        'registrationNumber': _regNumber.text.trim(),
        'employeeCount': int.tryParse(_employeeCount.text) ?? 10,
        if (_selectedPlanId != null) 'subscriptionPlanId': _selectedPlanId,
        'isInsuranceCompany': _isInsurance,
      };
      if (_isInsurance) {
        body['monthlyContribution'] = double.tryParse(_monthlyContribution.text) ?? 0;
        if (_coverageDescription.text.trim().isNotEmpty) {
          body['coverageDescription'] = _coverageDescription.text.trim();
        }
      }
      final res = await ApiClient.instance.post('/corporate/companies', data: body);
      if ((res.data as Map?)?['success'] == true) {
        await _load();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text((res.data as Map?)?['message']?.toString() ?? 'Failed to create company'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Network error'), backgroundColor: Colors.red),
        );
      }
    }
    finally { if (mounted) setState(() => _savingCompany = false); }
  }

  Future<void> _invite() async {
    final user = ref.read(authProvider).user;
    if (user == null || _inviteEmail.text.trim().isEmpty) return;
    setState(() => _inviting = true);
    try {
      final res = await ApiClient.instance.post('/corporate/${user['id']}/members/invite', data: {
        'email': _inviteEmail.text.trim(),
      });
      if ((res.data as Map?)?['success'] == true) {
        _inviteEmail.clear();
        await _load();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Invitation sent'), backgroundColor: Colors.green),
          );
        }
      }
    } catch (_) {}
    finally { if (mounted) setState(() => _inviting = false); }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('My Company', style: TextStyle(fontWeight: FontWeight.bold))),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_company == null)
              _buildCreateForm()
            else ...[
              _buildCompanyHeader(),
              const SizedBox(height: 16),
              const CompanyAnalyticsCard(),
              if (_insuranceData != null) _buildInsuranceMembersTable(),
              if (_insuranceData != null) const SizedBox(height: 16),
              _buildInviteSection(),
              const SizedBox(height: 16),
              _buildMembersList(),
              CompanyDangerZone(
                companyId: _company!['id']?.toString() ?? '',
                companyName: _company!['companyName']?.toString() ?? 'company',
                onChanged: _load,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCreateForm() {
    return Card(
      color: const Color(0xFFEAF6F8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Create your company', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 16)),
            const SizedBox(height: 4),
            const Text(
              'Any user can start a company. Optionally flag it as an insurance scheme — members then pay a fixed monthly contribution.',
              style: TextStyle(color: Colors.black54, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(controller: _companyName, decoration: const InputDecoration(labelText: 'Company name *', border: OutlineInputBorder())),
            const SizedBox(height: 8),
            TextField(controller: _industry, decoration: const InputDecoration(labelText: 'Industry', border: OutlineInputBorder())),
            const SizedBox(height: 8),
            TextField(controller: _regNumber, decoration: const InputDecoration(labelText: 'Registration number', border: OutlineInputBorder())),
            const SizedBox(height: 8),
            TextField(
              controller: _employeeCount, keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Approx. employees', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String?>(
              value: _selectedPlanId,
              decoration: const InputDecoration(
                labelText: 'Subscription plan (applies to all members)',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('— No group plan —')),
                ..._corporatePlans.map((p) => DropdownMenuItem<String?>(
                      value: p['id']?.toString(),
                      child: Text(
                        '${p['name']} (${p['currency'] ?? 'MUR'} ${p['price']}/member)',
                        overflow: TextOverflow.ellipsis,
                      ),
                    )),
              ],
              onChanged: (v) => setState(() => _selectedPlanId = v),
            ),
            const SizedBox(height: 10),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('This is an insurance company'),
              subtitle: const Text('Members will pay a monthly contribution', style: TextStyle(fontSize: 12)),
              value: _isInsurance,
              onChanged: (v) => setState(() => _isInsurance = v),
              activeColor: MediWyzColors.teal,
            ),
            if (_isInsurance) ...[
              TextField(
                controller: _monthlyContribution, keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Monthly contribution (MUR) *', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _coverageDescription,
                decoration: const InputDecoration(
                  labelText: 'Coverage description',
                  hintText: 'e.g. Hospitalization, outpatient, dental',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _savingCompany ? null : _createCompany,
              style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
              child: _savingCompany
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Create', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompanyHeader() {
    final isInsurance = _company?['isInsuranceCompany'] == true;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(
                child: Text(
                  _company!['companyName']?.toString() ?? 'Company',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: MediWyzColors.navy),
                ),
              ),
              if (isInsurance)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: Colors.indigo.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.shield_outlined, size: 12, color: Colors.indigo),
                    SizedBox(width: 3),
                    Text('Insurance', style: TextStyle(fontSize: 10, color: Colors.indigo, fontWeight: FontWeight.w600)),
                  ]),
                ),
            ]),
            if (_company!['industry'] != null)
              Text(_company!['industry'].toString(), style: const TextStyle(color: Colors.black54)),
            const SizedBox(height: 10),
            Row(
              children: [
                _Stat(label: 'Employees', value: '${_stats?['employeeCount'] ?? _members.length}'),
                const SizedBox(width: 12),
                _Stat(label: 'Active', value: '${_stats?['activeEmployees'] ?? 0}'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInsuranceMembersTable() {
    final summary = (_insuranceData!['summary'] as Map?) ?? {};
    final members = ((_insuranceData!['members'] as List?) ?? []).cast<dynamic>();
    final currentMonth = _insuranceData!['currentMonth']?.toString() ?? '';
    final mc = _insuranceData!['company'] as Map?;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              const Icon(Icons.shield_outlined, color: Colors.indigo),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Insurance members · $currentMonth',
                  style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy),
                ),
              ),
            ]),
            if (mc != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  'Fixed monthly contribution: MUR ${(mc['monthlyContribution'] ?? 0).toString()}',
                  style: const TextStyle(color: Colors.black54, fontSize: 12),
                ),
              ),
            const Divider(height: 18),
            Row(children: [
              _TinyStat(label: 'Members', value: '${summary['total'] ?? 0}', color: Colors.black87),
              _TinyStat(label: 'Paid', value: '${summary['paid'] ?? 0}', color: Colors.green),
              _TinyStat(label: 'Unpaid', value: '${summary['unpaid'] ?? 0}', color: Colors.red),
              _TinyStat(label: 'Collected', value: 'MUR ${summary['collectedRevenue'] ?? 0}', color: Colors.indigo),
            ]),
            const Divider(height: 18),
            if (members.isEmpty)
              const Padding(padding: EdgeInsets.symmetric(vertical: 10), child: Text('No members yet.', textAlign: TextAlign.center, style: TextStyle(color: Colors.black54)))
            else
              ...members.map((m) {
                final mp = m as Map;
                final paid = mp['paidThisMonth'] == true;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(children: [
                    CircleAvatar(radius: 14, backgroundColor: paid ? Colors.green.shade100 : Colors.red.shade100,
                      child: Icon(paid ? Icons.check : Icons.close, size: 14, color: paid ? Colors.green.shade700 : Colors.red.shade700),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(mp['name']?.toString() ?? 'Member', style: const TextStyle(fontWeight: FontWeight.w500)),
                          Text(mp['email']?.toString() ?? '', style: const TextStyle(fontSize: 11, color: Colors.black54)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: (paid ? Colors.green : Colors.red).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        paid ? 'Paid' : 'Unpaid',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: paid ? Colors.green.shade700 : Colors.red.shade700),
                      ),
                    ),
                  ]),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildInviteSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Invite employee', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _inviteEmail,
                  decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder(), isDense: true),
                  keyboardType: TextInputType.emailAddress,
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal),
                onPressed: _inviting ? null : _invite,
                child: _inviting
                    ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Invite'),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _buildMembersList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          child: Text('Employees', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
        ),
        if (_members.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Center(child: Text('No employees yet', style: TextStyle(color: Colors.black54))),
            ),
          )
        else
          ..._members.map((m) {
            final user = m['user'] is Map ? m['user'] as Map : m;
            final name = '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim();
            return Card(
              margin: const EdgeInsets.only(bottom: 6),
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                title: Text(name.isEmpty ? 'Employee' : name),
                subtitle: Text(user['email']?.toString() ?? ''),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: (m['status'] == 'active' ? Colors.green : Colors.amber).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    m['status']?.toString() ?? 'pending',
                    style: TextStyle(fontSize: 10, color: m['status'] == 'active' ? Colors.green.shade700 : Colors.amber.shade800, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            );
          }),
      ],
    );
  }

  @override
  void dispose() {
    _companyName.dispose(); _industry.dispose(); _regNumber.dispose(); _employeeCount.dispose();
    _monthlyContribution.dispose(); _coverageDescription.dispose();
    _inviteEmail.dispose();
    super.dispose();
  }
}

class _Stat extends StatelessWidget {
  final String label; final String value;
  const _Stat({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: MediWyzColors.sky.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.navy, fontSize: 18)),
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.black54)),
          ],
        ),
      );
}

class _TinyStat extends StatelessWidget {
  final String label; final String value; final Color color;
  const _TinyStat({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 14)),
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.black54)),
          ],
        ),
      );
}
