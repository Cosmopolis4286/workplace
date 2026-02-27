import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { BranchesService } from './branches.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateBranchDto } from './dto/create-branch.dto'
import { UpdateBranchDto } from './dto/update-branch.dto'
import { UpdateBranchStatusDto } from './dto/update-branch-status.dto'

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get('stats')
  getStats(@CurrentUser() user: { id: string }) {
    return this.branchesService.getStats(user.id)
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.branchesService.findAll(user.id)
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.branchesService.findOne(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(user.id, dto)
  }

  @Put(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.branchesService.remove(user.id, id)
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateBranchStatusDto,
  ) {
    return this.branchesService.updateStatus(user.id, id, dto.status)
  }
}
